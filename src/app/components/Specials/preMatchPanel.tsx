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
import { MarketNavigation } from "../marketNavigation";
import { MoneylineMatch } from "../MatchesBoard/components/Match/MoneylineMatch";

// --- Popular matches feature (disabled) ----------------------------------
// The `/popular` endpoint isn't ready yet. All popular-matches handling is
// commented out and the SportsList "Popular" tab is hidden until the API
// returns. Keep the imports + state stubs in place so re-enabling is a
// localized change.
// import { apiGetMatchesAuto } from "@/api/matches/apiGetMatchesAuto";
// import { apiGetFeaturedMatches } from "@/api/special-matches/apiGetFeaturedMatches";
// import { popularMatchesState } from "@/state/popularMatchesState";

const PAGE_SIZE = 10;
const DEFAULT_SPORT_ID = 1; // Soccer
const FALLBACK_MARKET_OPTIONS = ["Match Result", "Total", "Handicap"];
const MONEYLINE_SPORT_NAMES = new Set(["Basketball", "Ice Hockey"]);

type TopLeague = { league: string; region: string };
type TopLeaguesMap = { [sport: string]: TopLeague[] };

const topLeaguesMap: TopLeaguesMap = {
  soccer: [
    { league: "Champions League", region: "Europe" },
    { league: "Premier League", region: "England" },
    { league: "La Liga", region: "Spain" },
    { league: "Serie A", region: "Italy" },
    { league: "Bundesliga", region: "Germany" },
    { league: "Ligue 1", region: "France" },
    { league: "Europa League", region: "Europe" },
    { league: "World Cup", region: "International" },
  ],
  basketball: [
    { league: "NBA", region: "USA" },
    { league: "EuroLeague", region: "Europe" },
  ],
  baseball: [
    { league: "MLB", region: "USA" },
    { league: "World Series", region: "USA" },
  ],
  hockey: [{ league: "NHL", region: "USA" }],
};

type FlatItem = {
  id: number;
  regionId: number;
  regionName: string;
  leagueId: number;
  leagueName: string;
  sportId: number;
  sportName: string;
};

const getLeaguePriority = (
  league: string,
  region: string,
  sport: string,
): number => {
  const sportKey = sport?.toLowerCase() ?? "";
  const topLeagues = topLeaguesMap[sportKey] ?? [];
  const index = topLeagues.findIndex(
    (top) =>
      top.league.toLowerCase() === league.toLowerCase() &&
      top.region.toLowerCase() === region.toLowerCase(),
  );
  return index === -1 ? Infinity : index;
};

/**
 * Order events for initial display. The new tuple summary doesn't carry a
 * per-event `startTime` so we can't sort by kick-off until events land in
 * `storeState`. We use league priority + lexical tiebreakers as a stable
 * pre-load order; once each event loads, the actual `startTime` is reflected
 * in the per-card display.
 */
const sortFlatList = (items: FlatItem[]): FlatItem[] =>
  [...items].sort((a, b) => {
    const priorityA = getLeaguePriority(
      a.leagueName,
      a.regionName,
      a.sportName,
    );
    const priorityB = getLeaguePriority(
      b.leagueName,
      b.regionName,
      b.sportName,
    );
    if (priorityA !== priorityB) return priorityA - priorityB;
    const regionCompare = a.regionName.localeCompare(b.regionName);
    if (regionCompare !== 0) return regionCompare;
    const leagueCompare = a.leagueName.localeCompare(b.leagueName);
    if (leagueCompare !== 0) return leagueCompare;
    return a.id - b.id;
  });

/**
 * Heuristic: does the event carry a market we can render in the requested
 * slot (used in live mode to filter out events whose market navigation
 * doesn't include the active slug). Same shape on every event since the
 * migration to `tEventModel.markets: Record<string, Signal<tMarketModel>>`.
 */
const liveMatchWouldRender = (
  event: any,
  marketSlug: string,
  allowAutoSelect: boolean,
): boolean => {
  if (!event?.markets) return false;
  const markets = Object.values(event.markets).map((sig: any) => sig.value);
  if (!markets.length) return false;
  if (markets.find((m: any) => m.name === marketSlug)?.id) return true;
  return allowAutoSelect && !!markets[0]?.id;
};

export const PreMatchPanel: FunctionComponent = () => {
  const { t } = useTranslate("navigation");

  // `selectedSport` is now a sport id (number) — Popular (id 0) is disabled
  // while the endpoint is unavailable.
  const [selectedSport, setSelectedSport] = useState<number>(DEFAULT_SPORT_ID);
  /** upcoming = prematch (current behaviour); live = in-play. */
  const [matchView, setMatchView] = useState<"upcoming" | "live" | "">("");

  const [loadingMatches, setLoadingMatches] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMarketName, setSelectedMarketName] =
    useState<string>("Match Result");
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
  const flatList: FlatItem[] = useMemo(() => {
    // --- Popular branch (disabled while endpoint is unavailable) ---
    // if (selectedSport === 0 /* Popular */) {
    //   const list: FlatItem[] = [];
    //   const state = popularMatchesState.value;
    //   for (const sport of Object.keys(state)) { /* ... */ }
    //   return sortFlatList(list);
    // }

    const summary = isLiveMode ? summarySportsLive.value : summarySports.value;
    const sportTuple = summary.data?.find((s) => s[0] === selectedSport);
    if (!sportTuple) return [];
    const sportName = sportTuple[1];

    const list: FlatItem[] = [];
    for (const region of sportTuple[2] ?? []) {
      const [regionId, regionName, leagues] = region;
      if (regionName === "Esoccer") continue;
      for (const league of leagues ?? []) {
        const [leagueId, leagueName, eventIds] = league;
        for (const eventId of eventIds ?? []) {
          list.push({
            id: eventId,
            regionId,
            regionName,
            leagueId,
            leagueName,
            sportId: selectedSport,
            sportName,
          });
        }
      }
    }
    return sortFlatList(list);
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
      const storedEvent = storeState.value[item.id]?.value;
      return !!storedEvent && isEventValidForDisplay(storedEvent);
    });
  }, [flatList, loadedCount, selectedSport, storeState.value]);

  // --- Popular fetch (disabled) ---
  // useEffect(() => {
  //   if (Object.keys(popularMatchesState.value).length > 0) return;
  //   (async () => {
  //     try {
  //       const res = await apiGetFeaturedMatches();
  //       popularMatchesState.value = (res ?? {}) as Record<...>;
  //     } catch (e) {
  //       console.error("Error fetching featured/popular matches:", e);
  //     }
  //   })();
  // }, []);

  // Reset per-sport pagination whenever the active sport or view changes.
  useEffect(() => {
    setLoadedCount({});
  }, [matchView, selectedSport]);

  /**
   * Initial fetch for the active (sport, matchView). Pulls the first
   * `PAGE_SIZE` event ids from `flatList`, fetches their details via
   * `apiGetMatches(ids)` and stores each with `storeEvent`.
   */
  useEffect(() => {
    if (!loadedSidebarState.value) return;

    const summary = isLiveMode ? summarySportsLive.value : summarySports.value;
    if (!summary.data) return;
    const sportTuple = summary.data.find((s) => s[0] === selectedSport);
    if (!sportTuple) return;

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

        const ids = firstBatch.map((x) => x.id);
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

    return () => {
      cancelled = true;
    };
  }, [selectedSport, matchView, loadedSidebarState.value, flatList]);

  const handleShowMore = useCallback(() => {
    (async () => {
      const current = loadedCount[selectedSport] ?? 0;
      if (loadingMore || current >= flatList.length) return;
      const nextBatch = flatList.slice(current, current + PAGE_SIZE);
      if (nextBatch.length === 0) return;

      setLoadingMore(true);
      try {
        const ids = nextBatch.map((x) => x.id);
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
    // Snap to the first live sport that actually has events.
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
          showPopular={false}
        />

        <MarketNavigation
          options={FALLBACK_MARKET_OPTIONS}
          selectedValue={selectedMarketName}
          onSelect={setSelectedMarketName}
        />
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
            {displayedEvents.map((event) => {
              const storedEvent = storeState.value[event.id]?.value;
              if (
                !storedEvent ||
                (!isLiveMode && !isEventValidForDisplay(storedEvent))
              )
                return null;

              const isMoneyline = MONEYLINE_SPORT_NAMES.has(
                storedEvent.sport?.name ?? "",
              );
              const marketSlug = selectedMarketName;
              const canRenderLiveMatch =
                !isLiveMode ||
                isMoneyline ||
                liveMatchWouldRender(storedEvent, marketSlug, true);
              if (!canRenderLiveMatch) return null;

              return (
                <div
                  key={event.id}
                  className="flex rounded-[8px] overflow-hidden mb-2"
                >
                  {isMoneyline ? (
                    <MoneylineMatch eventId={event.id} />
                  ) : (
                    <Match
                      eventId={event.id}
                      marketSlug={marketSlug}
                      showLeagueLogo={true}
                      allowAutoSelect={isLiveMode}
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
