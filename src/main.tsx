import { initSportsbookApp } from "@/core/sportsbookInit";
import type {
  SportsbookInitOptions,
  SportsbookInstance,
} from "@/core/sportsbookInit";
import { initThemeColors } from "./core/theme";

// Export SDK
export { initSportsbookApp };
export type { SportsbookInitOptions, SportsbookInstance };

// Auto-initialize in development when placeholder exists
if (import.meta.env.DEV && typeof document !== "undefined") {
  const container = document.getElementById("sportsbook-placeholder");
  if (container) {
    initSportsbookApp({
      host: import.meta.env.VITE_API_HOST || "https://api.example.com",
      cid: import.meta.env.VITE_PARTNER_ID || "dev-partner-id",
      lang: "en",
      containerId: "sportsbook-placeholder",
      themeEditorData: import.meta.env.VITE_THEME_COLORS as string,
      disallowUrlChange: true,
      allowToChangeParentStyles: true,
      // token: "00001b81",
      operatorCode: "TEST_OPERATOR",
      xApiKey: import.meta.env.VITE_TEST_API_KEY,
      xApiCode: import.meta.env.VITE_TEST_API_CODE,
      // xSportsbookToken: "ca2794c80244103b9",
      xUserId: "00002659",
      xUserName: "test1",
      xUserBalance: 15293700,
      currency: "TRY",
      bottomLayoutHeight: 64,
      baseTheme: "dark",
    });
    initThemeColors(
      container.shadowRoot || document,
      import.meta.env.VITE_THEME_COLORS as string,
    );
  }
}

// Expose SDK globally
if (typeof window !== "undefined") {
  (window as any).Sportsbook = { init: initSportsbookApp };
}
