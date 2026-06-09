import { useEffect, useMemo, useState } from "preact/hooks";
import {
  filterMarketOptionsByEvents,
  isMoneylineSport,
} from "@/helpers/sidebarMarketNavigation";
import { isRacingSport } from "@/helpers/isRacingSport";
import { summarySportsState } from "@/state/summarySports";
import { getAppConfig } from "@/shared/config/appConfig";

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
  const [selectedMarketType, setSelectedMarketType] = useState<
    number[] | number
  >(1);

  const sidebarMarketOptions = useMemo(() => {
    const sportMarkets =
      summarySportsState.value.find((s) => s.sportId === sportId)?.markets ??
      [];
    return enabled && sportId > 0
      ? sportMarkets.map((m) => ({
          id: m.candidates,
          label: m.translations[getAppConfig().lang] ?? "",
        }))
      : [];
  }, [enabled, sportId, summarySportsState.value]);

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
      setSelectedMarketType(marketOptions[0].id as number);
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
