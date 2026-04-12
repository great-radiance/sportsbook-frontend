import {
  initSportsbookApp,
  SportsbookInitOptions,
  SportsbookInstance,
} from "@/core/sportsbookInit";

declare global {
  interface Window {
    SportsbookDatabetrix?: {
      init: (options: SportsbookInitOptions) => SportsbookInstance;
    };
  }
}

if (typeof window !== "undefined") {
  window.SportsbookDatabetrix = {
    init: initSportsbookApp,
  };
}

export { initSportsbookApp };
export type { SportsbookInitOptions, SportsbookInstance };
