import { useEffect } from "preact/hooks";
import { betSlipExpanded } from "@/shared/utils/BetSlipExpanded";
import { homeWidgetsRefreshNonce } from "@/state/homeWidgetsRefresh";

export const HOME_WIDGET_REFRESH_MS = 60_000;

/**
 * Poll home widgets every 60s; pause when bet slip is open or tab is hidden.
 * @see integration guide — Refresh & Caching Strategy
 */
export function useHomeWidgetPolling(load: () => void | Promise<void>): void {
  useEffect(() => {
    let cancelled = false;

    const run = () => {
      if (cancelled || betSlipExpanded.value || document.hidden) return;
      void Promise.resolve(load());
    };

    void Promise.resolve(load());
    const intervalId = window.setInterval(run, HOME_WIDGET_REFRESH_MS);

    const onVisibility = () => {
      if (!document.hidden && !betSlipExpanded.value) {
        void Promise.resolve(load());
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const unsubNonce = homeWidgetsRefreshNonce.subscribe(() => {
      if (!cancelled && !betSlipExpanded.value && !document.hidden) {
        void Promise.resolve(load());
      }
    });

    const unsubSlip = betSlipExpanded.subscribe((expanded) => {
      if (!cancelled && !expanded && !document.hidden) {
        void Promise.resolve(load());
      }
    });

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      unsubNonce();
      unsubSlip();
    };
  }, [load]);
}
