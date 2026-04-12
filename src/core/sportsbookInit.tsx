import { render } from "preact";
import { createI18nStore } from "@/shared/i18n/i18n";
import { AppRoot } from "@/app/AppRoot";
import { setAppConfig } from "@/shared/config/appConfig";
import { applyThemeEditorData, injectCustomStyles } from "./theme";
import { createShadowRootIfNeeded, getContainerElement } from "./host";
import { registerIconLibrary } from "@shoelace-style/shoelace";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { initThemeColors } from "./theme";
import { initToast } from "@/shared/toast";

export interface BannerBetslipConfig {
  name: string;
  url: string;
  height?: {
    desktop?: string;
    mobile?: string;
  };
}

export interface SportsbookInitOptions {
  host: string;
  cid: string;
  allowToChangeParentStyles?: boolean;
  disallowUrlChange?: boolean;
  lang?: string;
  token?: string;
  containerId?: string;
  themeEditorData?: string;
  customStyles?: string;
  cssUrl?: string;
  operatorCode?: string;
  xApiKey?: string;
  xApiCode?: string;
  xSportsbookToken?: string;
  xUserId?: string;
  xUserName?: string;
  xUserBalance?: number;
  currency?: string;
  // Added for shadow DOM CSS injection
  // ... other props like loginUrl, depositUrl, sub_partner_id, etc.

  bottomLayoutHeight?: number;
  injectCustomStyles?: string;
  baseTheme?: string;
}

export interface SportsbookInstance {
  destroy(): void;
}

export function initSportsbookApp(
  options: SportsbookInitOptions,
): SportsbookInstance {
  const {
    host,
    cid,
    allowToChangeParentStyles,
    disallowUrlChange,
    lang = import.meta.env.VITE_TEST_LANGUAGE,
    token = import.meta.env.VITE_TEST_USER_ID,
    containerId,
    themeEditorData,
    customStyles,
    cssUrl,
    operatorCode,
    xApiKey = import.meta.env.VITE_TEST_API_KEY,
    xApiCode = import.meta.env.VITE_TEST_API_CODE,
    xSportsbookToken,
    xUserId,
    xUserName,
    xUserBalance,
    currency,
    bottomLayoutHeight,
    baseTheme = "dark",
  } = options;

  setAppConfig({
    host,
    cid,
    token,
    lang,
    disallowUrlChange,
    operatorCode,
    xApiKey,
    xApiCode,
    xSportsbookToken,
    xUserId,
    xUserName,
    xUserBalance,
    currency,
    bottomLayoutHeight: bottomLayoutHeight ?? 64,
    baseTheme,
  });

  const container = getContainerElement({
    containerId,
    defaultId: "sportsbook-placeholder",
    allowToChangeParentStyles,
  });

  const { rootNode, mountPoint } = createShadowRootIfNeeded(
    container,
    allowToChangeParentStyles ?? false,
  );

  // CRITICAL: If using shadow DOM, inject CSS into it BEFORE rendering
  const isShadowDOM = rootNode instanceof ShadowRoot;

  let pageshowHandler: ((e: PageTransitionEvent) => void) | null = null;

  if (isShadowDOM) {
    if (cssUrl) {
      injectStylesIntoShadow(rootNode as ShadowRoot, cssUrl);
      // Re-inject CSS when page is restored from bfcache (e.g. after history.back()) so styles apply again
      pageshowHandler = (e: PageTransitionEvent) => {
        if (e.persisted) {
          injectStylesIntoShadow(rootNode as ShadowRoot, cssUrl, {
            force: true,
          });
        }
      };
      window.addEventListener("pageshow", pageshowHandler);
    } else {
      console.error(
        "[Sportsbook] Shadow DOM mode requires cssUrl option. Content may not render correctly.",
      );
      // Try to inject a placeholder style to at least show something
      const placeholderStyle = document.createElement("style");
      placeholderStyle.textContent = `
        * { visibility: visible !important; }
        .sb-container { min-height: 100px; }
      `;
      rootNode.appendChild(placeholderStyle);
    }
  }

  registerIconLibrary("sportsbook-icons", {
    resolver: (name) => `${BASE_ASSET_PUBLIC_URL}/icons/${name}.png`,
  });

  // applyThemeEditorData(rootNode, themeEditorData);
  // injectCustomStyles(rootNode, customStyles);
  console.log("runing init");
  initThemeColors(rootNode as ShadowRoot | Document, themeEditorData || "");
  initToast(rootNode);
  //set base color theme to html element
  // if (rootNode instanceof ShadowRoot) {
  //   rootNode.host.setAttribute("data-theme", baseTheme || "dark");
  // } else {
  //   document.documentElement.setAttribute("data-theme", baseTheme || "dark");
  // }

  const i18n = createI18nStore(lang);

  render(
    <AppRoot i18n={i18n} disallowUrlChange={disallowUrlChange} />,
    mountPoint,
  );

  return {
    destroy() {
      if (pageshowHandler) {
        window.removeEventListener("pageshow", pageshowHandler);
      }
      render(null, mountPoint);
    },
  };
}

const SPORTSBOOK_CSS_LINK_ID = "sportsbook-css-link";
const SPORTSBOOK_MAIN_STYLES_ID = "sportsbook-main-styles";

// Helper to inject CSS into shadow DOM
function injectStylesIntoShadow(
  shadowRoot: ShadowRoot,
  cssUrl: string,
  options?: { force?: boolean },
) {
  const force = options?.force === true;
  const existingLink = shadowRoot.querySelector<HTMLLinkElement>(
    `#${SPORTSBOOK_CSS_LINK_ID}`,
  );
  const existingStyle = shadowRoot.querySelector(
    `#${SPORTSBOOK_MAIN_STYLES_ID}`,
  );

  // If same style/link already exists with same href, do nothing (unless force re-inject e.g. after bfcache restore)
  if (!force && existingLink && existingLink.href === cssUrl) return;

  const existingLinkOrStyle = existingLink ?? existingStyle;

  // Use link tag first (faster, better for large CSS)
  const link = document.createElement("link");
  link.id = SPORTSBOOK_CSS_LINK_ID;
  link.rel = "stylesheet";
  link.href = cssUrl;
  link.onerror = () => {
    console.error(
      "[Sportsbook] Failed to load CSS via link tag, trying fetch...",
    );
    fetch(cssUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((cssText) => {
        const style = document.createElement("style");
        style.id = SPORTSBOOK_MAIN_STYLES_ID;
        style.textContent = cssText;
        const prev = shadowRoot.querySelector(`#${SPORTSBOOK_CSS_LINK_ID}`);
        if (prev) prev.replaceWith(style);
        else if (shadowRoot.firstChild)
          shadowRoot.insertBefore(style, shadowRoot.firstChild);
        else shadowRoot.appendChild(style);
      })
      .catch((err) => {
        console.error("[Sportsbook] Failed to load CSS:", err);
      });
  };

  // Replace existing or insert at beginning
  if (existingLinkOrStyle) existingLinkOrStyle.replaceWith(link);
  else if (shadowRoot.firstChild)
    shadowRoot.insertBefore(link, shadowRoot.firstChild);
  else shadowRoot.appendChild(link);
}
