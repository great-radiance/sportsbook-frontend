import { initSportsbookApp } from "@/core/sportsbookInit";
import type {
  SportsbookInitOptions,
  SportsbookInstance,
} from "@/core/sportsbookInit";
import { initThemeColors } from "./core/theme";

export { initSportsbookApp };
export type { SportsbookInitOptions, SportsbookInstance };

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
      xOperatorId:
        import.meta.env.VITE_OPERATOR_ID ||
        import.meta.env.VITE_API_ID ||
        "a57f61c93d95b624",
      xSportsbookToken: import.meta.env.VITE_USER_JWT as string | undefined,
      xUserId: import.meta.env.VITE_USER_ID || "00002659",
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

if (typeof window !== "undefined") {
  (window as any).Sportsbook = { init: initSportsbookApp };
}
