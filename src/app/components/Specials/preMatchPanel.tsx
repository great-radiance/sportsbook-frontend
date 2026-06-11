import { FunctionComponent } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { useTranslate } from "@/shared/i18n/i18n";
import { SportsList } from "../SportsList";
import { UpcomingMatchSkeleton } from "@/app/components/Loading";
import { MarketNavigation } from "../marketNavigation";
import { Match } from "../MatchesBoard/components/Match";
import { MoneylineMatch } from "../MatchesBoard/components/Match/MoneylineMatch";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { apiGetPopularMatches } from "@/api/matches/apiGetPopularMatches";
import { apiGetUpcomingEvents } from "@/api/matches/apiGetUpcoming";
import type { MatchDataResponse } from "@/api/matches/apiGetMatchData";
import { storeEvent } from "@/helpers/storeEvent";
import { storeState } from "@/state/storeState";
import {
  countsSummarySportsState,
  summarySportsState,
} from "@/state/summarySports";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { useSidebarMarketNavigation } from "@/hooks/useSidebarMarketNavigation";
import {
  eventHasMarketType,
  isMoneylineSport,
  liveMatchWouldRender,
} from "@/helpers/sidebarMarketNavigation";
import { getSportMarkets } from "@/helpers/findSidebarNodeByRoute";
import { isRacingSport } from "@/helpers/isRacingSport";
// import { isDisplayablePopularEvent } from "@/helpers/buildPopularMatchesFromSidebar";
import {
  isEventValidForDisplay,
  sortEventIdsByStartDate,
} from "@/helpers/sortEventIdsByStartDate";
import { POPULAR_SPORT_ID } from "@/helpers/summaryIds";
import { baseColorTheme } from "@/state/baseColorTheme";
import { popularMatchesState } from "@/state/popularMatchesState";

function sportsFromSidebar(isLive: boolean) {
  const counts = isLive
    ? countsSummarySportsState.value.liveCount.counts
    : countsSummarySportsState.value.preMatchCount.counts;

  return summarySportsState.value
    .filter((node) => node.type === "sport" || node.type === "combined_sport")
    .map((node) => {
      const sportId = node.sportId ?? 0;
      return {
        id: sportId,
        name: node.name,
        count: counts[sportId] ?? 0,
      };
    })
    .filter((sport) => sport.id > 0 && sport.count > 0);
}

export const PreMatchPanel: FunctionComponent = () => {
  const { t } = useTranslate("navigation");
  const { t: tLive } = useTranslate("liveCalendar");
  const baseTheme = baseColorTheme.value;

  const [matchView, setMatchView] = useState<"upcoming" | "live" | "">("");
  const [selectedSport, setSelectedSport] = useState(POPULAR_SPORT_ID);
  const [eventIds, setEventIds] = useState<number[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const isLiveMode = matchView === "live";

  const sportsData = useMemo(
    () => sportsFromSidebar(isLiveMode),
    [isLiveMode, summarySportsState.value, countsSummarySportsState.value],
  );

  const selectedSportName = useMemo(
    () =>
      sportsData.find((sport) => sport.id === selectedSport)?.name ??
      `Sport ${selectedSport}`,
    [sportsData, selectedSport],
  );

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!loadedSidebarState.value) return;

      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        let ids: number[] = [];
        let responseTotal = 0;
        let responsePage = nextPage;

        if (selectedSport === POPULAR_SPORT_ID) {
          const matches = popularMatchesState.value.slice(
            (nextPage - 1) * 10,
            nextPage * 10,
          );
          matches;
          ids = matches.map((match) => match.eventInfo.id);
          responseTotal = popularMatchesState.value.length;
          responsePage = nextPage;
        } else {
          const response = await apiGetUpcomingEvents({
            sport: selectedSport,
            page: nextPage,
            isTrending: isLiveMode,
          });
          response.data.forEach((match: MatchDataResponse) =>
            storeEvent(match),
          );
          ids = response.data.map((match) => match.eventInfo.id);
          responseTotal = response.total;
          responsePage = response.page;
        }

        setEventIds((prev) => {
          if (!append) return ids;
          const seen = new Set(prev);
          return [...prev, ...ids.filter((id) => !seen.has(id))];
        });
        setTotal(responseTotal);
        setPage(responsePage);
      } catch (error) {
        console.error("Error fetching join-the-action matches:", error);
        setLoading(false);
        setLoadingMore(false);
        if (!append) {
          setEventIds([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedSport, isLiveMode, popularMatchesState.value],
  );

  useEffect(() => {
    if (!loadedSidebarState.value) return;
    void loadPage(1, false);
  }, [loadPage, loadedSidebarState.value]);

  useEffect(() => {
    if (selectedSport === POPULAR_SPORT_ID) return;
    if (!sportsData.some((sport) => sport.id === selectedSport)) {
      setSelectedSport(POPULAR_SPORT_ID);
    }
  }, [sportsData, selectedSport]);

  const displayedEventIds = useMemo(() => {
    const visible = eventIds.filter((id) => {
      const event = storeState.value[id]?.value;
      if (!event) return false;
      if (selectedSport === POPULAR_SPORT_ID) {
        return true;
        // return isDisplayablePopularEvent(event);
      }
      if (isLiveMode) return event.status === 3;
      return isEventValidForDisplay(event);
    });
    return sortEventIdsByStartDate(visible);
  }, [eventIds, selectedSport, isLiveMode, storeState.value]);

  const loadedEventsForMarkets = useMemo(
    () =>
      displayedEventIds
        .map((id) => storeState.value[id]?.value)
        .filter(Boolean),
    [displayedEventIds, storeState.value],
  );

  const sportMarkets = useMemo(
    () =>
      selectedSport === POPULAR_SPORT_ID
        ? []
        : getSportMarkets(summarySportsState.value, selectedSport),
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
    enabled: selectedSport !== POPULAR_SPORT_ID,
    suppressMarketNav:
      selectedSport === POPULAR_SPORT_ID ||
      isMoneylineSport(selectedSport, selectedSportName) ||
      isRacingSport(selectedSport, selectedSportName),
  });

  const activeMarketType = Array.isArray(selectedMarketType)
    ? selectedMarketType[0]
    : selectedMarketType;

  const handleSelectLiveView = useCallback(() => {
    setMatchView("live");
    const firstLive = sportsFromSidebar(true)[0];
    if (firstLive) setSelectedSport(firstLive.id);
  }, []);

  const handleSelectUpcomingView = useCallback(() => {
    setMatchView("upcoming");
    setSelectedSport(POPULAR_SPORT_ID);
  }, []);

  const hasMore = eventIds.length < total;

  if (!loading && eventIds.length === 0 && !loadedSidebarState.value) {
    return null;
  }

  return (
    <section className="flex w-full flex-col gap-2 overflow-hidden rounded-[16px] text-[var(--text-basic-color)]">
      <div className="sticky top-0 flex w-full flex-col">
        <div className="flex w-full items-center justify-between pt-4 pb-2">
          <h2 className="m-0 text-[20px] font-bold uppercase">
            {t("Join-the-action")}
          </h2>

          <div
            className="flex shrink-0 items-center gap-1 rounded-[10px] p-1"
            role="group"
            aria-label="Match type"
          >
            <div
              className={`flex min-w-0 items-center rounded-[8px] border text-[12px] font-medium transition-colors ${
                matchView === "live"
                  ? "border-[var(--primary-color)] bg-[var(--sub-element-color)] text-[var(--text-basic-color)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                  : "border-[var(--primary-border-color)] bg-transparent text-[var(--text-basic-color)]"
              }`}
            >
              <button
                type="button"
                onClick={handleSelectLiveView}
                className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5"
              >
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/icons/multiple.png`}
                  className="h-4 w-4 object-contain"
                  alt=""
                />
                {matchView !== "upcoming" ? (
                  <span className="truncate">{t("live")}</span>
                ) : null}
              </button>
              {matchView === "live" ? (
                <button
                  type="button"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[16px] leading-none text-[var(--text-sub-color)] hover:bg-black/5 hover:text-[var(--text-basic-color)]"
                  onClick={() => setMatchView("")}
                  aria-label={t("upcoming")}
                >
                  ×
                </button>
              ) : null}
            </div>

            <div
              className={`flex min-w-0 items-center rounded-[8px] border text-[12px] font-medium transition-colors ${
                matchView === "upcoming"
                  ? "border-[var(--primary-color)] bg-[var(--sub-element-color)] text-[var(--text-basic-color)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                  : "border-[var(--primary-border-color)] bg-transparent text-[var(--text-basic-color)]"
              }`}
            >
              <button
                type="button"
                onClick={handleSelectUpcomingView}
                className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5"
              >
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/icons/clock.png`}
                  className={`h-4 w-4 object-contain ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                  alt=""
                />
                {matchView !== "live" ? (
                  <span className="truncate">{t("upcoming")}</span>
                ) : null}
              </button>
              {matchView === "upcoming" ? (
                <button
                  type="button"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[16px] leading-none text-[var(--text-sub-color)] hover:bg-black/5 hover:text-[var(--text-basic-color)]"
                  onClick={() => setMatchView("")}
                  aria-label={t("live")}
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <SportsList
          sportsData={sportsData}
          selectedSport={selectedSport}
          onSelectSport={setSelectedSport}
          loading={loading}
          isLive={isLiveMode}
          showPopular
        />

        {showMarketNav ? (
          <MarketNavigation
            options={marketOptions}
            selectedValue={selectedMarketType}
            onSelect={setSelectedMarketType}
          />
        ) : null}
      </div>

      {loading ? (
        <div className="mt-1 flex flex-col gap-[2px] py-[2px]">
          <UpcomingMatchSkeleton />
          <UpcomingMatchSkeleton />
          <UpcomingMatchSkeleton />
        </div>
      ) : displayedEventIds.length === 0 ? (
        <p className="m-0 px-2 py-4 text-[12px] text-[var(--text-sub-color)]">
          {tLive("noDataAvailable")}
        </p>
      ) : (
        <>
          <div className="mt-1 flex flex-col rounded-[4px]">
            {displayedEventIds.map((eventId) => {
              const stored = storeState.value[eventId]?.value;
              if (!stored) return null;

              const isMoneyline = isMoneylineSport(
                stored.sport?.id ?? selectedSport,
                stored.sport?.name,
              );

              if (
                showMarketNav &&
                !isMoneyline &&
                !eventHasMarketType(stored, activeMarketType)
              ) {
                return null;
              }

              const canRenderLive =
                !isLiveMode ||
                isMoneyline ||
                !showMarketNav ||
                liveMatchWouldRender(stored, activeMarketType, allowAutoSelect);
              if (!canRenderLive) return null;

              return (
                <div
                  key={eventId}
                  className="mb-2 flex overflow-hidden rounded-[8px]"
                >
                  {isMoneyline ? (
                    <MoneylineMatch eventId={eventId} />
                  ) : (
                    <Match
                      eventId={eventId}
                      marketType={matchMarketType}
                      showLeagueLogo
                      allowAutoSelect={allowAutoSelect}
                      allowRounded
                    />
                  )}
                </div>
              );
            })}

            {loadingMore ? (
              <div className="mt-1 flex flex-col gap-[2px] py-[2px]">
                <UpcomingMatchSkeleton />
                <UpcomingMatchSkeleton />
              </div>
            ) : null}
          </div>

          {hasMore ? (
            <button
              type="button"
              className="cursor-pointer rounded-full bg-[var(--sub-element-secondary)] px-2 py-1 text-[12px] text-[var(--text-secondary-color)] disabled:opacity-50 md:mx-[5px] md:py-2"
              onClick={() => void loadPage(page + 1, true)}
              disabled={loadingMore}
            >
              Show More
            </button>
          ) : null}
        </>
      )}
    </section>
  );
};
