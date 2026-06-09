import { useEffect, useMemo, useState } from "preact/hooks";
import type { MarketInfoType } from "@/api/sidebar/apiGetSidebar";
import {
  filterMarketOptionsByEvents,
  marketOptionsFromMarketInfo,
  marketTypesEqual,
} from "@/helpers/sidebarMarketNavigation";

type UseSidebarMarketNavigationArgs = {
  /** Sidebar sport `markets` config (candidates + translations). */
  markets: MarketInfoType[];
  loadedEvents: unknown[];
  /** When false, hides nav (e.g. popular cross-sport tab). Default true. */
  enabled?: boolean;
  /** Hide nav for moneyline / racing layouts (set at call site). */
  suppressMarketNav?: boolean;
};

export function useSidebarMarketNavigation({
  markets,
  loadedEvents,
  enabled = true,
  suppressMarketNav = false,
}: UseSidebarMarketNavigationArgs) {
  const [selectedMarketType, setSelectedMarketType] = useState<
    number[] | number
  >(1);

  const sidebarMarketOptions = useMemo(
    () => (enabled ? marketOptionsFromMarketInfo(markets) : []),
    [enabled, markets],
  );

  const marketOptions = useMemo(
    () => filterMarketOptionsByEvents(sidebarMarketOptions, loadedEvents),
    [sidebarMarketOptions, loadedEvents],
  );

  const showMarketNav =
    enabled && !suppressMarketNav && marketOptions.length > 0;

  useEffect(() => {
    if (!showMarketNav || !marketOptions.length) return;
    if (
      !marketOptions.some((o) => marketTypesEqual(o.id, selectedMarketType))
    ) {
      setSelectedMarketType(marketOptions[0].id);
    }
  }, [showMarketNav, marketOptions, selectedMarketType]);

  return {
    selectedMarketType,
    setSelectedMarketType,
    marketOptions,
    showMarketNav,
    allowAutoSelect: !showMarketNav,
    matchMarketType: showMarketNav ? selectedMarketType : undefined,
  };
}
