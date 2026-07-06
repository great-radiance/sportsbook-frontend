/** @jsxImportSource preact */
import { useState, useCallback, useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import type { LocationHook } from "wouter-preact";
import { sportsbookStore } from "@/state/sportsbookStoreContext";

const { routeFullState, routePathState, routeState } = sportsbookStore;

// Memory hook: in-memory routing (routeType = "memory")
// Uses global signal for shared state
export const useMemoryLocation: LocationHook = () => {
  // Subscribe to the global signal - MUST be called during render, not in callbacks
  useSignal(); // This subscribes the component to routeState changes

  // Get current path from signal
  const path = routeState.value;

  const navigate = useCallback((to: string) => {
    // Update global signal - this will trigger re-renders in all components using useSignal()
    routeState.value = to;
  }, []);

  return [path, navigate];
};

const PREFIX = "#sportsbook=";

function prettyEncodePath(value: string): string {
  // Step 1: escape underscores so we can safely use "_" for spaces
  const escaped = value.replace(/_/g, "__").replace(/ /g, "_");

  // Step 2: normal URI encoding, then keep slashes readable
  return encodeURIComponent(escaped).replace(/%2F/g, "/");
}

function prettyDecodePath(value: string): string {
  // Step 1: decode percent-encoding
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }

  // Step 2: restore spaces + underscores
  // Convert "_" -> space, then "__" -> "_" (order matters, so do "__" placeholder trick)
  // Use a placeholder to avoid conflicts
  const PLACEHOLDER = "\u0000"; // unlikely in URLs
  return decoded
    .replace(/__/g, PLACEHOLDER) // saved underscores
    .replace(/_/g, " ") // spaces
    .replace(new RegExp(PLACEHOLDER, "g"), "_"); // restore underscores
}

export function readFullFromHash(): string {
  const hash = window.location.hash || "";
  if (!hash.startsWith(PREFIX)) return "/";

  const raw = hash.slice(PREFIX.length) || "/";

  const full = prettyDecodePath(raw);
  return full.startsWith("/") ? full : "/" + full;
}

function stripToPathname(full: string): string {
  const q = full.indexOf("?");
  const h = full.indexOf("#");
  const cut = [q, h].filter((i) => i >= 0).sort((a, b) => a - b)[0];
  return cut != null ? full.slice(0, cut) : full;
}

function writeFullToHash(full: string, replace?: boolean) {
  const normalized = full.startsWith("/") ? full : "/" + full;

  const encoded = prettyEncodePath(normalized);
  const nextHash = PREFIX + encoded;

  const url = window.location.pathname + window.location.search + nextHash;

  if (replace) window.history.replaceState(null, "", url);
  else window.location.hash = nextHash;
}

export const useHashLocation: LocationHook = () => {
  const [pathname, setPathname] = useState(() =>
    stripToPathname(readFullFromHash()),
  );

  useEffect(() => {
    const onChange = () => setPathname(stripToPathname(readFullFromHash()));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    writeFullToHash(to, opts?.replace);
    if (opts?.replace) setPathname(stripToPathname(readFullFromHash()));
  }, []);

  return [pathname, navigate];
};

// Memory hook with history: routeType = "memory" (syncs with history.state)
const STATE_KEY = "__sportsbook_route_full__";

function getFromState(): string | null {
  const st = window.history.state;
  return st && typeof st === "object" && STATE_KEY in st ? st[STATE_KEY] : null;
}

function setToState(full: string, replace: boolean) {
  const next = { ...(window.history.state || {}), [STATE_KEY]: full };
  if (replace) window.history.replaceState(next, "");
  else window.history.pushState(next, "");
}

export const useMemoryLocationWithHistory: LocationHook = () => {
  useSignal(); // subscribe to signals used below

  const isPopRef = useRef(false);

  // IMPORTANT: return pathname only so wouter route matching works
  const pathForRouter = routePathState.value;

  useEffect(() => {
    const existing = getFromState();
    if (existing) {
      routeFullState.value = existing;
    } else {
      const initial = routeFullState.value || "/";
      setToState(initial, true);
      routeFullState.value = initial;
    }

    const onPop = () => {
      isPopRef.current = true;
      const full = getFromState();
      if (full && full !== routeFullState.value) routeFullState.value = full;
      queueMicrotask(() => (isPopRef.current = false));
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    if (to === routeFullState.value) return;

    const replace = isPopRef.current ? true : !!opts?.replace;
    setToState(to, replace);
    routeFullState.value = to;
  }, []);

  return [pathForRouter, navigate];
};
