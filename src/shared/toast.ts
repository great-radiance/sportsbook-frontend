/** @jsxImportSource preact */
import { setBasePath } from "@shoelace-style/shoelace/dist/utilities/base-path.js";

// Register Shoelace components you use
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";

type Variant = "primary" | "success" | "warning" | "error";

/** Root where the app is mounted (shadow root or document). When shadow, we render toast on document.body and inject resolved styles. */
let toastRoot: ShadowRoot | Document | null = null;

/** Escape text for safe HTML injection */
function escapeHtml(text: unknown) {
  const div = document.createElement("div");
  div.textContent = String(text ?? "");
  return div.innerHTML;
}

/**
 * Configure Shoelace asset path (icons, etc.)
 * Use a fixed version (avoid @2.*) to prevent CDN resolution issues.
 */
export function setupShoelaceBasePath(
  basePath = "https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.15.0/dist/",
) {
  setBasePath(basePath);
}

const SHOELACE_THEME_ID = "shoelace-theme-light";
const SHOELACE_THEME_HREF =
  "https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.15.0/dist/themes/light.css";
const APP_TOAST_STYLES_ID = "app-toast-styles";

/**
 * Ensure Shoelace theme CSS is loaded in the given root (document or shadow root).
 * In shadow mode, theme must be inside the shadow root so sl-alert renders correctly.
 */
function ensureShoelaceTheme(root: Document | ShadowRoot = document) {
  const existing =
    root instanceof ShadowRoot
      ? root.querySelector(`#${SHOELACE_THEME_ID}`)
      : (root as Document).getElementById?.(SHOELACE_THEME_ID);
  if (existing) return;

  const link = document.createElement("link");
  link.id = SHOELACE_THEME_ID;
  link.rel = "stylesheet";
  link.href = SHOELACE_THEME_HREF;
  if (root instanceof ShadowRoot) {
    root.insertBefore(link, root.firstChild);
  } else {
    (root as Document).head.appendChild(link);
  }
}

/** Custom toast styles using project CSS variables (when styles run inside same root as variables, e.g. dev / non-embedded) */
function getToastStyles(): string {
  return `
    .sl-toast-stack {
      z-index: 2147483647;
    }
    .sl-toast-stack sl-alert::part(base) {
      background: var(--sub-element-color) !important;
      color: var(--text-basic-color) !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .sl-toast-stack sl-alert::part(message) {
      color: var(--text-basic-color) !important;
    }
    .sl-toast-stack sl-alert::part(close-button),
    .sl-toast-stack sl-alert::part(close-button__base) {
      color: var(--text-basic-color) !important;
    }
    .sl-toast-stack sl-alert::part(close-button):hover,
    .sl-toast-stack sl-alert::part(close-button__base):hover {
      color: var(--text-basic-color) !important;
      opacity: 0.8;
    }
    .sl-toast-stack sl-alert.app-toast--success::part(base) { border: 4px solid var(--primary-color); }
    .sl-toast-stack sl-alert.app-toast--warning::part(base) { border: 4px solid var(--text-yellow, #ffd700); }
    .sl-toast-stack sl-alert.app-toast--error::part(base)   { border: 4px solid var(--text-red, #ff3449); }
    .sl-toast-stack sl-alert.app-toast--primary::part(base) { border: 4px solid var(--primary-color); }
  `;
}

/** Resolve CSS variable from shadow host (for embedded mode: toast lives on document.body, vars live in shadow). */
function getResolvedToastStyles(host: Element): string {
  const s = getComputedStyle(host);
  const bg = s.getPropertyValue("--sub-element-color").trim() || "#121713";
  const text =
    s.getPropertyValue("--text-basic-color-dark").trim() || "#c9c9c9";
  const primary = s.getPropertyValue("--primary-color").trim() || "#3b82f6";
  const yellow = s.getPropertyValue("--text-yellow").trim() || "#ffd700";
  const red = s.getPropertyValue("--text-red").trim() || "#ff3449";
  return `
    .sl-toast-stack { z-index: 2147483647; }
    .sl-toast-stack sl-alert::part(base) {
      background: ${bg} !important;
      color: ${text} !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .sl-toast-stack sl-alert::part(message) { color: ${text} !important; }
    .sl-toast-stack sl-alert::part(close-button),
    .sl-toast-stack sl-alert::part(close-button__base) { color: ${text} !important; }
    .sl-toast-stack sl-alert::part(close-button):hover,
    .sl-toast-stack sl-alert::part(close-button__base):hover { color: ${text} !important; opacity: 0.8; }
    .sl-toast-stack sl-alert.app-toast--success::part(base) { border: 4px solid ${primary}; }
    .sl-toast-stack sl-alert.app-toast--warning::part(base) { border: 4px solid ${yellow}; }
    .sl-toast-stack sl-alert.app-toast--error::part(base)   { border: 4px solid ${red}; }
    .sl-toast-stack sl-alert.app-toast--primary::part(base)  { border: 4px solid ${primary}; }
  `;
}

/** Inject app toast styles into the given root (document only for var() styles). */
function injectToastStyles(doc: Document) {
  if (doc.getElementById(APP_TOAST_STYLES_ID)) return;
  const style = document.createElement("style");
  style.id = APP_TOAST_STYLES_ID;
  style.textContent = getToastStyles();
  doc.head.appendChild(style);
}

/** When embedded (shadow), toast stack is on document.body. Inject styles with resolved vars from shadow host so toast is visible and themed. */
function injectResolvedToastStylesIntoDocument(host: Element) {
  const doc = host.ownerDocument;
  if (!doc) return;
  let style = doc.getElementById(
    APP_TOAST_STYLES_ID,
  ) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = APP_TOAST_STYLES_ID;
    doc.head.appendChild(style);
  }
  style.textContent = getResolvedToastStyles(host);
}

/**
 * Initialize toast for embedded/shadow mode. Call once at app init with the root where the app is mounted.
 * - When rootNode is a ShadowRoot (embedded): toast stack stays on document.body so it is not clipped by the host.
 *   Resolved styles (from shadow host CSS vars) are injected into document on first notify().
 * - When rootNode is Document (dev / non-embedded): styles with var() are injected into document.
 */
export function initToast(rootNode: ShadowRoot | Document) {
  toastRoot = rootNode;

  if (rootNode instanceof ShadowRoot) {
    ensureShoelaceTheme(document);
  } else {
    ensureShoelaceTheme(document);
    injectToastStyles(document);
  }
}

/** Make sure the toast stack is above overlays (stack is always on document.body) */
function bumpToastStackZIndex(zIndex = "2147483647") {
  const stack = document.querySelector("sl-toast-stack") as HTMLElement | null;
  if (stack) stack.style.zIndex = zIndex;
}

/**
 * Shadow/embedded-safe notify (same signature as your current usage)
 *
 * @param message - Text to show
 * @param variant - "primary" | "success" | "warning" | "error"
 * @param icon - Shoelace icon name
 * @param duration - Auto-close duration in ms (0 = stay until closed)
 * @param container - Optional: where to temporarily append the alert before toast()
 */
export function notify(
  message: string,
  variant: Variant = "primary",
  icon = "info-circle",
  duration = 3000,
  container?: HTMLElement | ShadowRoot,
) {
  ensureShoelaceTheme(document);

  const root = toastRoot ?? document;
  if (root instanceof ShadowRoot) {
    injectResolvedToastStylesIntoDocument(root.host);
  }

  const alert = Object.assign(document.createElement("sl-alert"), {
    variant: variant === "error" ? "danger" : variant,
    closable: true,
    duration,
  }) as HTMLElement & { toast: () => Promise<void> };

  alert.classList.add("app-toast", `app-toast--${variant}`);
  alert.innerHTML = `
    <sl-icon name="${escapeHtml(icon)}" slot="icon"></sl-icon>
    ${escapeHtml(message)}
  `;

  alert.style.zIndex = "2147483647";

  const target = container ?? document.body;
  if (target instanceof ShadowRoot) {
    target.append(alert);
  } else {
    (target as HTMLElement).appendChild(alert);
  }

  const result = alert.toast();

  queueMicrotask(() => bumpToastStackZIndex("2147483647"));

  return result;
}
