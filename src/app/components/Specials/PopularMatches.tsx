import { FunctionComponent } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { UpcomingMatchSkeleton } from "@/app/components/Loading";
import { useTranslate } from "@/shared/i18n/i18n";
import { SportsList } from "../SportsList";
import { MarketNavigation } from "../marketNavigation";
import { Match } from "../MatchesBoard/components/Match";
import { MoneylineMatch } from "../MatchesBoard/components/Match/MoneylineMatch";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { useSidebarMarketNavigation } from "@/hooks/useSidebarMarketNavigation";
import {
  eventHasMarketType,
  isMoneylineSport,
} from "@/helpers/sidebarMarketNavigation";
import { getSportMarkets } from "@/helpers/findSidebarNodeByRoute";
import { isRacingSport } from "@/helpers/isRacingSport";
import { SOCCER_SPORT_ID } from "@/helpers/summaryIds";
import {
  isEventValidForDisplay,
  sortEventIdsByStartDate,
} from "@/helpers/sortEventIdsByStartDate";

export const PopularMatches: FunctionComponent = () => {
  const {
    loadedSidebarState,
    popularMatchesState,
    storeState,
    summarySportsState,
  } = useSportsbookStore();
  const { t } = useTranslate("liveCalendar");

  const [selectedSport, setSelectedSport] = useState<number>(SOCCER_SPORT_ID);
  const [loading, setLoading] = useState(true);

  const sportsData = useMemo(() => {
    const bySport = new Map<
      number,
      { id: number; name: string; count: number }
    >();

    for (const match of popularMatchesState.value) {
      const sportId = match.eventInfo.sport?.id ?? 0;
      if (sportId <= 0) continue;

      const existing = bySport.get(sportId);
      if (existing) {
        existing.count += 1;
      } else {
        bySport.set(sportId, {
          id: sportId,
          name: match.eventInfo.sport?.name ?? `Sport ${sportId}`,
          count: 1,
        });
      }
    }

    return [...bySport.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [popularMatchesState.value]);

  const displayedEventIds = useMemo(() => {
    const ids = popularMatchesState.value
      .filter((match) => (match.eventInfo.sport?.id ?? 0) === selectedSport)
      .map((match) => match.eventInfo.id);
    // .filter((id) => {
    //   const event = storeState.value[id]?.value;
    //   return event ? isEventValidForDisplay(event) : false;
    // });

    return sortEventIdsByStartDate(ids);
  }, [popularMatchesState.value, selectedSport, storeState.value]);

  const loadedEventsForMarkets = useMemo(
    () =>
      displayedEventIds
        .map((id) => storeState.value[id]?.value)
        .filter(Boolean),
    [displayedEventIds, storeState.value],
  );

  const selectedSportName = useMemo(
    () =>
      sportsData.find((sport) => sport.id === selectedSport)?.name ??
      `Sport ${selectedSport}`,
    [sportsData, selectedSport],
  );

  const sportMarkets = useMemo(
    () => getSportMarkets(summarySportsState.value, selectedSport),
    [selectedSport, summarySportsState.value],
  );

  const {
    marketOptions,
    showMarketNav,
    selectedMarketType,
    setSelectedMarketType,
    matchMarketType,
    allowAutoSelect,
  } = useSidebarMarketNavigation({
    markets: sportMarkets,
    loadedEvents: loadedEventsForMarkets,
    suppressMarketNav:
      isMoneylineSport(selectedSport, selectedSportName) ||
      isRacingSport(selectedSport, selectedSportName),
  });

  useEffect(() => {
    if (!loadedSidebarState.value) return;
    setLoading(false);
  }, [loadedSidebarState.value, popularMatchesState.value]);

  useEffect(() => {
    if (sportsData.length === 0) return;
    if (!sportsData.some((sport) => sport.id === selectedSport)) {
      setSelectedSport(sportsData[0].id);
    }
  }, [sportsData, selectedSport]);

  if (!loadedSidebarState.value || sportsData.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col md:px-2 rounded-[16px] text-[var(--text-basic-color)] w-full min-h-0 overflow-y-auto">
      <div className="flex flex-1 items-center pt-4 pb-2 md:px-4 gap-2 text-[20px]">
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/top.png`}
          className="w-[24px] h-[24px] object-contain invert"
          alt=""
        />
        <span className="text-[20px] font-bold">{t("TopMatches")}</span>
      </div>

      <div className="flex w-full md:px-2">
        <SportsList
          sportsData={sportsData}
          selectedSport={selectedSport}
          onSelectSport={setSelectedSport}
          showPopular={false}
        />
      </div>

      {showMarketNav ? (
        <MarketNavigation
          options={marketOptions}
          selectedValue={selectedMarketType}
          onSelect={setSelectedMarketType}
        />
      ) : null}

      {loading ? (
        <div className="flex flex-col w-full gap-[2px] mt-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <UpcomingMatchSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col w-full h-full rounded-lg overflow-hidden">
          {displayedEventIds.length === 0 ? (
            <div className="px-2 py-4 text-[12px] text-[var(--text-sub-color)]">
              {t("noDataAvailable")}
            </div>
          ) : (
            displayedEventIds.map((eventId) => {
              const stored = storeState.value[eventId]?.value;
              if (
                showMarketNav &&
                stored &&
                !isMoneylineSport(
                  stored.sport?.id ?? selectedSport,
                  stored.sport?.name,
                ) &&
                !eventHasMarketType(stored, selectedMarketType)
              ) {
                return null;
              }
              if (
                stored &&
                isMoneylineSport(
                  stored.sport?.id ?? selectedSport,
                  stored.sport?.name,
                )
              ) {
                return (
                  <div
                    key={eventId}
                    className="flex flex-col w-full rounded-[4px]"
                  >
                    <MoneylineMatch eventId={eventId} />
                  </div>
                );
              }
              return (
                <div
                  key={eventId}
                  className="flex flex-col w-full rounded-[4px]"
                >
                  <Match
                    eventId={eventId}
                    marketType={matchMarketType}
                    allowAutoSelect={allowAutoSelect}
                  />
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
