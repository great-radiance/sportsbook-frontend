import { effect } from "@preact/signals";
import { setAppConfig, getAppConfig } from "@/shared/config/appConfig";
import { sportsbookStore } from "@/state/sportsbookStoreContext";
import { getActiveI18n } from "@/core/sportsbookInit";
import {
  isSportsbookHostMessage,
  SPORTSBOOK_EMBED_SOURCE,
  type SportsbookEmbedOutboundMessage,
  type SportsbookHostInboundMessage,
} from "./protocol";

const { routeFullState } = sportsbookStore;

export function isRunningInIframe(): boolean {
  try {
    return typeof window !== "undefined" && window.self !== window.top;
  } catch {
    return true;
  }
}

function postToParent(message: SportsbookEmbedOutboundMessage): void {
  if (!isRunningInIframe() || !window.parent) return;
  window.parent.postMessage(JSON.stringify(message), "*");
}

export function notifyLoginClick(): void {
  postToParent({ type: "click", target: "loginButton" });
}

export function notifyDepositClick(): void {
  postToParent({ type: "click", target: "depositButton" });
}

function applyHostSession(
  payload: Extract<SportsbookHostInboundMessage, { type: "session" }>["payload"],
): void {
  const current = getAppConfig();
  const next = {
    ...current,
    lang: payload.lang ?? current.lang,
    xUserId: payload.xUserId ?? current.xUserId,
    xUserName: payload.xUserName ?? current.xUserName,
    xUserBalance: payload.xUserBalance ?? current.xUserBalance,
    currency: payload.currency ?? current.currency,
    xSportsbookToken: payload.xSportsbookToken ?? current.xSportsbookToken,
  };
  setAppConfig(next);

  if (payload.lang) {
    getActiveI18n()?.setLocale(payload.lang);
  }
}

function encodeSportsbookRoute(route: string): string {
  const normalized = route.startsWith("/") ? route : `/${route}`;
  const escaped = normalized.replace(/_/g, "__").replace(/ /g, "_");
  return encodeURIComponent(escaped).replace(/%2F/g, "/");
}

function applyHostNavigation(path: string): void {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  routeFullState.value = normalized;
  const nextHash = `#sportsbook=${encodeSportsbookRoute(normalized)}`;
  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash.slice(1);
  }
}

function observeDocumentHeight(): () => void {
  let frame = 0;
  let lastHeight = 0;

  const publish = () => {
    frame = 0;
    const height = Math.ceil(
      Math.max(
        document.documentElement.scrollHeight,
        document.body?.scrollHeight ?? 0,
      ),
    );
    if (height > 0 && height !== lastHeight) {
      lastHeight = height;
      postToParent({
        source: SPORTSBOOK_EMBED_SOURCE,
        type: "resize",
        payload: { height },
      });
    }
  };

  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(publish);
  };

  const resizeObserver =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(schedule)
      : null;

  resizeObserver?.observe(document.documentElement);
  if (document.body) resizeObserver?.observe(document.body);
  window.addEventListener("resize", schedule);
  schedule();

  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    resizeObserver?.disconnect();
    window.removeEventListener("resize", schedule);
  };
}

export function initIframeBridge(): () => void {
  if (!isRunningInIframe()) return () => undefined;

  postToParent({ source: SPORTSBOOK_EMBED_SOURCE, type: "ready" });

  const stopHeightObserver = observeDocumentHeight();

  const stopRouteEffect = effect(() => {
    const path = routeFullState.value;
    postToParent({
      source: SPORTSBOOK_EMBED_SOURCE,
      type: "navigation",
      payload: { path },
    });
  });

  const onMessage = (event: MessageEvent) => {
    let data: unknown = event.data;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        return;
      }
    }
    if (!isSportsbookHostMessage(data)) return;

    if (data.type === "session") {
      applyHostSession(data.payload);
      return;
    }
    if (data.type === "navigate") {
      applyHostNavigation(data.payload.path);
    }
  };

  window.addEventListener("message", onMessage);

  return () => {
    stopHeightObserver();
    stopRouteEffect();
    window.removeEventListener("message", onMessage);
  };
}
