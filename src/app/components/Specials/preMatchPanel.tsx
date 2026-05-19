import { FunctionComponent } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";

import { apiGetMatches } from "@/api/matches/apiGetMatches";
import { useTranslate } from "@/shared/i18n/i18n";
import { summarySports, summarySportsLive } from "@/state/summarySports";
import { SportsList } from "../SportsList";
import { UpcomingMatchSkeleton } from "@/app/components/Loading";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { storeState } from "@/state/storeState";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { loadedAllMatches } from "@/state/loadedAllMatches";
import { Match } from "../MatchesBoard/components/Match";
import { loadedMatchesState } from "@/state/loadedMatchesState";
import { loadedPrematchState } from "@/state/loadedPrematch";
import { isEventValidForDisplay } from "@/helpers/sortEventIdsByStartDate";
import { baseColorTheme } from "@/state/baseColorTheme";
import { useRouteParams } from "@/hooks/useRotueParams";
import { storeEvent } from "@/helpers/storeEvent";
import { MarketNavigation, type MarketNavOption } from "../marketNavigation";
import { MoneylineMatch } from "../MatchesBoard/components/Match/MoneylineMatch";
import {
  isSoccerSport,
  sortSoccerFlatMatches,
} from "@/helpers/soccerLeagueTiers";
import {
  POPULAR_SPORT_ID,
  SOCCER_SPORT_ID,
  type SummaryEventRef,
} from "@/helpers/summaryIds";
import type { SidebarMarketRef } from "@/state/summarySports";

const PAGE_SIZE = 10;
const DEFAULT_SPORT_ID = SOCCER_SPORT_ID;
/** Sport ids that render the moneyline layout (names come from event payload). */
const MONEYLINE_SPORT_IDS = new Set([8, 6, 7, 14]); // Basketball

function isMoneylineSport(sportId: number, sportName?: string): boolean {
  return MONEYLINE_SPORT_IDS.has(sportId) || /hockey/i.test(sportName ?? "");
}

function marketTabSortKey(ref: SidebarMarketRef): number {
  const orders = ref.groups?.map((g) => g.order) ?? [];
  return orders.length > 0 ? Math.min(...orders) : ref.id;
}

function marketOptionsFromRef(
  refs: SidebarMarketRef[] | undefined,
): MarketNavOption[] {
  if (!refs?.length) return [];
  return refs
    .slice()
    .sort((a, b) => {
      const orderDiff = marketTabSortKey(a) - marketTabSortKey(b);
      if (orderDiff !== 0) return orderDiff;
      return a.id - b.id;
    })
    .map((m) => ({ id: m.id, label: m.name }));
}

function eventHasMarketType(event: unknown, marketType: number): boolean {
  const markets = (
    event as { markets?: Record<string, { value?: { type?: number } }> }
  )?.markets;
  if (!markets) return false;
  return Object.values(markets).some((sig) => sig?.value?.type === marketType);
}

/**
 * Heuristic: does the event carry a market we can render in the requested
 * slot (used in live mode to filter out events whose market navigation
 * doesn't include the active slug). Same shape on every event since the
 * migration to `tEventModel.markets: Record<string, Signal<tMarketModel>>`.
 */
const liveMatchWouldRender = (
  event: any,
  marketType: number,
  allowAutoSelect: boolean,
): boolean => {
  if (!event?.markets) return false;
  const markets = Object.values(event.markets).map((sig: any) => sig.value);
  if (!markets.length) return false;
  if (markets.find((m: any) => m.type === marketType)?.id) return true;
  return allowAutoSelect && !!markets[0]?.id;
};

export const PreMatchPanel: FunctionComponent = () => {
  const { t } = useTranslate("navigation");

  // `selectedSport` is a sport id (number); `POPULAR_SPORT_ID` uses `/sidebar` index `[0]`.
  const [selectedSport, setSelectedSport] = useState<number>(DEFAULT_SPORT_ID);
  /** upcoming = prematch (current behaviour); live = in-play. */
  const [matchView, setMatchView] = useState<"upcoming" | "live" | "">("");

  const [loadingMatches, setLoadingMatches] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMarketType, setSelectedMarketType] = useState<number>(1);
  const [sportsData, setSportsData] = useState<
    { count: number; name: string; id: number }[]
  >([]);
  const [isSportsListInitialized, setIsSportsListInitialized] =
    useState<boolean>(false);
  const [loadedCount, setLoadedCount] = useState<Record<number, number>>({});
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const { pageName } = useRouteParams();

  const isLiveMode = matchView === "live";

  /**
   * Flatten the tuple-tree summary for the active sport into one ordered list
   * of `FlatItem`s. `summarySports` (prematch) and `summarySportsLive` share
   * the same tuple shape — only the source changes by `matchView`.
   */
  const flatList: SummaryEventRef[] = useMemo(() => {
    const summary = isLiveMode ? summarySportsLive.value : summarySports.value;

    if (selectedSport === POPULAR_SPORT_ID) {
      const ids = summary.featuredMatches?.[1] ?? [];
      return ids.map((eventId) => ({
        eventId,
        sportId: POPULAR_SPORT_ID,
        regionId: 0,
        leagueId: 0,
      }));
    }

    const sportTuple = summary.data?.find((s) => s[0] === selectedSport);
    if (!sportTuple) return [];

    const list: SummaryEventRef[] = [];
    for (const region of sportTuple[2] ?? []) {
      const [regionId, , leagues] = region;
      for (const league of leagues ?? []) {
        const [leagueId, , eventIds] = league;
        for (const eventId of eventIds ?? []) {
          list.push({
            eventId,
            sportId: selectedSport,
            regionId,
            leagueId,
          });
        }
      }
    }
    if (isSoccerSport(null, selectedSport)) {
      return sortSoccerFlatMatches(list);
    }
    return list;
  }, [selectedSport, isLiveMode, summarySports.value, summarySportsLive.value]);

  /**
   * Sliced view of `flatList` based on `loadedCount[selectedSport]`, filtered
   * down to events that have actually landed in `storeState` and still look
   * displayable. Reading `storeState.value` here means this memo re-evaluates
   * as events stream in.
   */
  const displayedEvents = useMemo(() => {
    const loaded = loadedCount[selectedSport] ?? 0;
    const candidates = flatList.slice(0, loaded);
    return candidates.filter((item) => {
      const storedEvent = storeState.value[item.eventId]?.value;
      return !!storedEvent && isEventValidForDisplay(storedEvent);
    });
  }, [flatList, loadedCount, selectedSport, storeState.value]);

  /** Market tabs from `/sidebar` `marketsRef` only (no fallback). */
  const sidebarMarketOptions = useMemo(() => {
    if (selectedSport === POPULAR_SPORT_ID) return [];
    const summary = isLiveMode ? summarySportsLive.value : summarySports.value;
    return marketOptionsFromRef(summary.marketsRef?.[String(selectedSport)]);
  }, [selectedSport, isLiveMode, summarySports.value, summarySportsLive.value]);

  /** Drop tabs that none of the loaded events offer; keep admin sort order. */
  const marketOptions = useMemo(() => {
    if (!sidebarMarketOptions.length) return [];
    const loadedEvents = displayedEvents
      .map((item) => storeState.value[item.eventId]?.value)
      .filter(Boolean);
    if (!loadedEvents.length) return sidebarMarketOptions;
    return sidebarMarketOptions.filter((opt) =>
      loadedEvents.some((ev) => eventHasMarketType(ev, opt.id)),
    );
  }, [sidebarMarketOptions, displayedEvents, storeState.value]);

  const isMoneylineSportSelected = useMemo(() => {
    if (selectedSport === POPULAR_SPORT_ID) return false;
    const summary = isLiveMode ? summarySportsLive.value : summarySports.value;
    const sport = summary.data?.find((s) => s[0] === selectedSport);
    return isMoneylineSport(selectedSport, String(sport?.[1] ?? ""));
  }, [selectedSport, isLiveMode, summarySports.value, summarySportsLive.value]);

  const showMarketNav =
    marketOptions.length > 0 &&
    !isMoneylineSportSelected &&
    selectedSport !== 0;

  useEffect(() => {
    if (!showMarketNav || !marketOptions.length) return;
    if (!marketOptions.some((o) => o.id === selectedMarketType)) {
      setSelectedMarketType(marketOptions[0].id);
    }
  }, [showMarketNav, marketOptions, selectedMarketType]);

  useEffect(() => {
    if (selectedSport !== POPULAR_SPORT_ID) return;
    const summary = isLiveMode ? summarySportsLive.value : summarySports.value;
    if ((summary.featuredMatches?.[1] ?? []).length === 0) {
      setSelectedSport(DEFAULT_SPORT_ID);
    }
  }, [selectedSport, isLiveMode, summarySports.value, summarySportsLive.value]);

  // Reset per-sport pagination whenever the active sport or view changes.
  useEffect(() => {
    setLoadedCount({});
  }, [matchView, selectedSport]);

  /**
   * Initial fetch for the active (sport, matchView). Pulls the first
   * `PAGE_SIZE` event ids from `flatList`, fetches their details via
   * `apiGetMatches(ids)` and stores each with `storeEvent`.
   */
  const getMatches = useCallback(async () => {
    if (!loadedSidebarState.value) return;

    const firstBatch = flatList.slice(0, PAGE_SIZE);

    if (firstBatch.length === 0) {
      setLoadingMatches(false);
      setLoading(false);
      setLoadedCount({ [selectedSport]: 0 });
      return;
    }

    setLoadedCount({ [selectedSport]: 0 });
    setLoadingMatches(true);

    let cancelled = false;

    (async () => {
      try {
        if (pageName) return; // Don't fetch a panel-wide page when a specific event is open.

        const ids = firstBatch.map((x) => x.eventId);
        const events = await apiGetMatches(ids);
        if (cancelled) return;

        (events ?? []).forEach((event) => storeEvent(event));

        setLoadedCount({ [selectedSport]: firstBatch.length });
        loadedPrematchState.value = true;
        loadedAllMatches.value = true;
      } catch (err) {
        console.error("Error fetching prematch matches:", err);
      } finally {
        if (!cancelled) {
          setLoadingMatches(false);
          setLoading(false);
          loadedMatchesState.value = true;
        }
      }
    })();
  }, [selectedSport, matchView, loadedSidebarState.value, flatList, pageName]);

  useEffect(() => {
    getMatches();
  }, [selectedSport, matchView, loadedSidebarState.value, pageName]);

  const handleShowMore = useCallback(() => {
    (async () => {
      const current = loadedCount[selectedSport] ?? 0;
      if (loadingMore || current >= flatList.length) return;
      const nextBatch = flatList.slice(current, current + PAGE_SIZE);
      if (nextBatch.length === 0) return;

      setLoadingMore(true);
      try {
        const ids = nextBatch.map((x) => x.eventId);
        const events = await apiGetMatches(ids);
        (events ?? []).forEach((event) => storeEvent(event));
        setLoadedCount((prev) => ({
          ...prev,
          [selectedSport]: (prev[selectedSport] ?? 0) + nextBatch.length,
        }));
      } catch (err) {
        console.error("Error fetching more prematch matches:", err);
      } finally {
        setLoadingMore(false);
      }
    })();
  }, [loadingMore, loadedCount, flatList, selectedSport]);

  const handleSelectLiveView = useCallback(() => {
    setMatchView("live");
    const firstLive = summarySportsLive.value.data?.find((s) => s[0]);
    if (firstLive) setSelectedSport(firstLive[0]);
  }, []);

  const handleSelectUpcomingView = useCallback(() => {
    setLoading(true);
    setLoadingMatches(true);
    setMatchView("upcoming");
  }, []);

  const handleDeselectUpcomingView = useCallback(() => {
    setLoading(true);
    setLoadingMatches(true);
    setMatchView("");
  }, []);

  // Build the SportsList tabs from the active summary signal.
  useEffect(() => {
    const summary = isLiveMode ? summarySportsLive.value : summarySports.value;
    const data = summary.data ?? [];
    setSportsData(
      data.map((sport) => {
        const [sportId, sportName, regions] = sport;
        const count = (regions ?? []).reduce(
          (regionAcc, region) =>
            regionAcc +
            (region[2] ?? []).reduce(
              (leagueAcc, league) => leagueAcc + (league[2] ?? []).length,
              0,
            ),
          0,
        );
        return { count, name: sportName, id: sportId };
      }),
    );
  }, [summarySports.value, summarySportsLive.value, isLiveMode]);

  useEffect(() => {
    if (sportsData.length > 0 && !isSportsListInitialized) {
      setIsSportsListInitialized(true);
    }
  }, [sportsData, isSportsListInitialized]);

  return (
    <div
      className={`overflow-hidden flex w-full flex-col gap-2 rounded-[16px] transition-all duration-300 ease-in-out text-[var(--text-basic-color)]`}
    >
      <div className="flex flex-col w-full sticky top-0">
        <div className="flex w-full pt-4 pb-2 items-center justify-between">
          <span className="text-[20px] uppercase font-bold">
            {t("Join-the-action")}
          </span>
          <div
            className="flex shrink-0 items-center gap-1 rounded-[10px]  p-1"
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
                {matchView !== "upcoming" && (
                  <span className="truncate">{t("live")}</span>
                )}
              </button>
              {matchView === "live" && (
                <button
                  type="button"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[16px] leading-none text-[var(--text-sub-color)] hover:bg-black/5 hover:text-[var(--text-basic-color)]"
                  onClick={() => setMatchView("")}
                  aria-label={t("upcoming")}
                >
                  ×
                </button>
              )}
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
                  className={`h-4 w-4 object-contain ${baseColorTheme.value === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                  alt=""
                />
                {matchView !== "live" && (
                  <span className="truncate">{t("upcoming")}</span>
                )}
              </button>
              {matchView === "upcoming" && (
                <button
                  type="button"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[16px] leading-none text-[var(--text-sub-color)] hover:bg-black/5 hover:text-[var(--text-basic-color)]"
                  onClick={handleDeselectUpcomingView}
                  aria-label={t("live")}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        <SportsList
          sportsData={sportsData}
          selectedSport={selectedSport}
          onSelectSport={(sport) => setSelectedSport(sport)}
          loading={loading && !isSportsListInitialized}
          isLive={isLiveMode}
          showPopular={
            (isLiveMode ? summarySportsLive.value : summarySports.value)
              .featuredMatches?.[1]?.length
              ? true
              : false
          }
        />

        {showMarketNav ? (
          <MarketNavigation
            options={marketOptions}
            selectedValue={selectedMarketType}
            onSelect={setSelectedMarketType}
          />
        ) : null}
      </div>

      {loadingMatches ? (
        <div className="flex flex-col mt-1 rounded-[4px]">
          <div className="flex flex-col gap-[2px] py-[2px]">
            <UpcomingMatchSkeleton />
            <UpcomingMatchSkeleton />
            <UpcomingMatchSkeleton />
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col mt-1 rounded-[4px]">
            {displayedEvents.map((item) => {
              const storedEvent = storeState.value[item.eventId]?.value;
              if (
                !storedEvent ||
                (!isLiveMode && !isEventValidForDisplay(storedEvent))
              )
                return null;

              const isMoneyline = isMoneylineSport(
                storedEvent.sport?.id ?? 0,
                storedEvent.sport?.name,
              );
              if (
                showMarketNav &&
                !isMoneyline &&
                !eventHasMarketType(storedEvent, selectedMarketType)
              ) {
                return null;
              }
              const canRenderLiveMatch =
                !isLiveMode ||
                isMoneyline ||
                !showMarketNav ||
                liveMatchWouldRender(storedEvent, selectedMarketType, false);
              if (!canRenderLiveMatch) return null;

              return (
                <div
                  key={item.eventId}
                  className="flex rounded-[8px] overflow-hidden mb-2"
                >
                  {isMoneyline ? (
                    <MoneylineMatch eventId={item.eventId} />
                  ) : (
                    <Match
                      eventId={item.eventId}
                      marketType={
                        showMarketNav ? selectedMarketType : undefined
                      }
                      showLeagueLogo={true}
                      allowAutoSelect={!showMarketNav}
                      allowRounded={true}
                    />
                  )}
                </div>
              );
            })}
            {loadingMore && (
              <div
                className="flex flex-col gap-[2px] py-[2px] mt-1"
                style={{ order: Number.MAX_SAFE_INTEGER }}
              >
                <UpcomingMatchSkeleton />
                <UpcomingMatchSkeleton />
                <UpcomingMatchSkeleton />
              </div>
            )}
          </div>
          {(loadedCount[selectedSport] ?? 0) > 0 &&
            (loadedCount[selectedSport] ?? 0) < flatList.length && (
              <button
                className="text-[12px] md:mx-[5px] md:py-2 text-[var(--text-secondary-color)] rounded-full cursor-pointer bg-[var(--sub-element-secondary)] px-2 py-1 disabled:opacity-50"
                type="button"
                onClick={() => handleShowMore()}
                disabled={loadingMore}
              >
                Show More
              </button>
            )}
        </>
      )}
    </div>
  );
};
