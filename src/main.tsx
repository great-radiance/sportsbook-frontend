import { initSportsbookApp } from "@/core/sportsbookInit";
import type {
  SportsbookInitOptions,
  SportsbookInstance,
} from "@/core/sportsbookInit";
import { initThemeColors } from "./core/theme";

export { initSportsbookApp };
export type { SportsbookInitOptions, SportsbookInstance };
export type { RouteType } from "@/app/router/routeType";

if (import.meta.env.DEV && typeof document !== "undefined") {
  const container = document.getElementById("sportsbook-placeholder");
  if (container) {
    initSportsbookApp({
      host: import.meta.env.VITE_API_HOST || "https://api.example.com",
      cid: import.meta.env.VITE_PARTNER_ID || "dev-partner-id",
      lang: "en",
      containerId: "sportsbook-placeholder",
      themeEditorData: import.meta.env.VITE_THEME_COLORS as string,
      routeType: "hash",
      allowToChangeParentStyles: true,
      xOperatorId: "betway-stage",
      xSportsbookToken: import.meta.env.VITE_USER_JWT as string | undefined,
      xUserId: "00006139",
      xUserName: "test1",
      xUserBalance: 15293700,
      currency: "USD",
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
