import { FunctionComponent } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { UpcomingMatchSkeleton } from "@/app/components/Loading";
import { useTranslate } from "@/shared/i18n/i18n";
import { SportsList } from "../SportsList";
import { apiGetMatches } from "@/api/matches/apiGetMatches";
import { popularMatchesState } from "@/state/popularMatchesState";
import { MarketNavigation } from "../marketNavigation";
import { storeEvent } from "@/helpers/storeEvent";
import { Match } from "../MatchesBoard/components/Match";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { storeState } from "@/state/storeState";
import { useSidebarMarketNavigation } from "@/hooks/useSidebarMarketNavigation";
import {
  eventHasMarketType,
  isMoneylineSport,
} from "@/helpers/sidebarMarketNavigation";
import { MoneylineMatch } from "../MatchesBoard/components/Match/MoneylineMatch";
import {
  allEventIdsFromBuckets,
  bucketsToPopularMatchesState,
  isDisplayablePopularEvent,
} from "@/helpers/buildPopularMatchesFromSidebar";
import {
  featuredBucketForSport,
  featuredSportBuckets,
} from "@/state/featuredMatchesState";
import {
  POPULAR_SPORT_ID,
  SOCCER_SPORT_ID,
} from "@/helpers/summaryIds";
import { sortEventIdsByStartDate } from "@/helpers/sortEventIdsByStartDate";

const BATCH_SIZE = 25;

export const PopularMatches: FunctionComponent = () => {
  const { t } = useTranslate("liveCalendar");

  const [selectedSport, setSelectedSport] = useState<number>(SOCCER_SPORT_ID);
  const [loading, setLoading] = useState<boolean>(true);
  const [hydrated, setHydrated] = useState(false);

  const sportBuckets = featuredSportBuckets.value;

  const sportTabs = useMemo(
    () => sportBuckets.filter((b) => b.sportId !== POPULAR_SPORT_ID),
    [sportBuckets],
  );

  const sportsData = useMemo(
    () =>
      sportTabs.map((bucket) => ({
        id: bucket.sportId,
        name: bucket.sportName,
        count: bucket.eventRefs.length,
      })),
    [sportTabs],
  );

  const selectedBucket = featuredBucketForSport(selectedSport);

  const displayedEventIds = useMemo(() => {
    const refs = selectedBucket?.eventRefs ?? [];
    const ids = refs
      .map((ref) => ref.eventId)
      .filter((id) => {
        const ev = storeState.value[id]?.value;
        return isDisplayablePopularEvent(ev);
      });
    return sortEventIdsByStartDate(ids);
  }, [selectedBucket, storeState.value, hydrated]);

  const loadedEventsForMarkets = useMemo(
    () =>
      displayedEventIds
        .map((id) => storeState.value[id]?.value)
        .filter(Boolean),
    [displayedEventIds, storeState.value],
  );

  const selectedSportName = useMemo(
    () =>
      sportsData.find((s) => s.id === selectedSport)?.name ??
      `Sport ${selectedSport}`,
    [sportsData, selectedSport],
  );

  const {
    marketOptions,
    showMarketNav,
    selectedMarketType,
    setSelectedMarketType,
    matchMarketType,
    allowAutoSelect,
  } = useSidebarMarketNavigation({
    sportId: selectedSport,
    sportName: selectedSportName,
    loadedEvents: loadedEventsForMarkets,
    enabled: true,
  });

  useEffect(() => {
    if (!loadedSidebarState.value) return;

    const eventIds = allEventIdsFromBuckets(sportTabs);
    if (eventIds.length === 0) {
      popularMatchesState.value = {};
      setHydrated(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setHydrated(false);
      try {
        for (let i = 0; i < eventIds.length; i += BATCH_SIZE) {
          const batchIds = eventIds.slice(i, i + BATCH_SIZE);
          const batch = await apiGetMatches(batchIds);
          if (cancelled) return;
          (batch ?? []).forEach((event) => storeEvent(event));
        }

        if (cancelled) return;

        popularMatchesState.value = bucketsToPopularMatchesState(sportTabs);
        setHydrated(true);
      } catch (error) {
        console.error("Error fetching popular featured matches:", error);
        if (!cancelled) {
          popularMatchesState.value = {};
          setHydrated(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [sportTabs, loadedSidebarState.value]);

  useEffect(() => {
    if (sportTabs.length === 0) return;
    if (!sportTabs.some((b) => b.sportId === selectedSport)) {
      setSelectedSport(sportTabs[0].sportId);
    }
  }, [sportTabs, selectedSport]);

  if (!loadedSidebarState.value || sportTabs.length === 0) {
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
            displayedEventIds.map((eventId) => (
              <div key={eventId} className="flex flex-col w-full rounded-[4px]">
                <div className="w-full h-full transition-all duration-300 ease-in-out">
                  <div className="flex flex-col w-full h-full">
                    {(() => {
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
                        return <MoneylineMatch eventId={eventId} />;
                      }
                      return (
                        <Match
                          eventId={eventId}
                          marketType={matchMarketType}
                          allowAutoSelect={allowAutoSelect}
                        />
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};