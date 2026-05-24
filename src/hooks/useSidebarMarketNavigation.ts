import { useEffect, useMemo, useState } from "preact/hooks";
import { marketsRef } from "@/state/summarySports";
import {
  filterMarketOptionsByEvents,
  isMoneylineSport,
  marketOptionsFromRef,
} from "@/helpers/sidebarMarketNavigation";
import { isRacingSport } from "@/helpers/isRacingSport";

type UseSidebarMarketNavigationArgs = {
  sportId: number;
  sportName?: string;
  loadedEvents: unknown[];
  /** When false, hides nav (e.g. popular cross-sport tab). Default true. */
  enabled?: boolean;
};

export function useSidebarMarketNavigation({
  sportId,
  sportName,
  loadedEvents,
  enabled = true,
}: UseSidebarMarketNavigationArgs) {
  const [selectedMarketType, setSelectedMarketType] = useState(1);

  const sidebarMarketOptions = useMemo(
    () =>
      enabled && sportId > 0
        ? marketOptionsFromRef(marketsRef.value[String(sportId)])
        : [],
    [enabled, sportId, marketsRef.value],
  );

  const marketOptions = useMemo(
    () => filterMarketOptionsByEvents(sidebarMarketOptions, loadedEvents),
    [sidebarMarketOptions, loadedEvents],
  );

  const isMoneylineSportSelected = useMemo(
    () => enabled && isMoneylineSport(sportId, sportName),
    [enabled, sportId, sportName],
  );

  const isRacingSportSelected = useMemo(
    () => enabled && isRacingSport(sportId, sportName),
    [enabled, sportId, sportName],
  );

  const showMarketNav =
    enabled &&
    marketOptions.length > 0 &&
    !isMoneylineSportSelected &&
    !isRacingSportSelected &&
    sportId > 0;

  useEffect(() => {
    if (!showMarketNav || !marketOptions.length) return;
    if (!marketOptions.some((o) => o.id === selectedMarketType)) {
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
