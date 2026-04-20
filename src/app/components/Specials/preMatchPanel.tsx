import { FunctionComponent } from "preact";
import { apiGetMatches } from "@/api/matches/apiGetMatches";
import { apiGetMatchesAuto } from "@/api/matches/apiGetMatchesAuto";
import { useTranslate } from "@/shared/i18n/i18n";
import { summarySports, summarySportsLive } from "@/state/summarySports";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import { SportsList } from "../SportsList";
import {
  LiveMatchesPanelLoader,
  UpcomingMatchSkeleton,
} from "@/app/components/Loading";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { storeState } from "@/state/storeState";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { loadedAllMatches } from "@/state/loadedAllMatches";
import { Match } from "../MatchesBoard/components/Match";
import { popularMatchesState } from "@/state/popularMatchesState";
import { apiGetFeaturedMatches } from "@/api/special-matches/apiGetFeaturedMatches";
import { loadedMatchesState } from "@/state/loadedMatchesState";
import { loadedPrematchState } from "@/state/loadedPrematch";
import { isEventValidForDisplay } from "@/helpers/sortEventIdsByStartDate";

import { baseColorTheme } from "@/state/baseColorTheme";
import { useRouteParams } from "@/hooks/useRotueParams";
import { convertAndStoreEvent } from "@/helpers/convertAndStoreEvent";
import { MarketNavigation } from "../marketNavigation";
import { getMarketId } from "@/hooks/useGetMarketId";
import { MoneylineMatch } from "../MatchesBoard/components/Match/MoneylineMatch";

// Top leagues configuration by sport
type TopLeague = {
  league: string;
  region: string;
};

type TopLeaguesMap = {
  [sport: string]: TopLeague[];
};

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

export const PreMatchPanel: FunctionComponent = () => {
  const { t: tCommon } = useTranslate("common");
  const { t } = useTranslate("navigation");

  const [selectedSport, setSelectedSport] = useState<string>("Popular");
  /** upcoming = prematch (current behavior); live = in-play from summarySportsLive */
  const [matchView, setMatchView] = useState<"upcoming" | "live" | "">("");

  const [loadingMatches, setLoadingMatches] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMarketName, setselectedMarketName] =
    useState<string>("Match Result");
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [sportsData, setSportsData] = useState<
    { count: number; name: string; slug: string }[]
  >([]);
  const [isSportsListInitialized, setIsSportsListInitialized] =
    useState<boolean>(false);
  const [loadedCount, setLoadedCount] = useState<Record<string, number>>({});
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [loadedSports, setLoadedSports] = useState<Record<string, Set<string>>>(
    {},
  );
  const { pageName } = useRouteParams();

  type FlatItem = {
    id: number;
    region: string;
    league: string;
    sport: string;
  };

  const liveMatchWouldRender = (
    event: any,
    marketSlug: string,
    allowAutoSelect: boolean,
  ) => {
    if (!event?.markets) return false;
    const markets = Object.values(event.markets).map((sig: any) => sig.value);
    if (!markets.length) return false;
    if (markets.find((m: any) => m.name === marketSlug)?.id) return true;
    return allowAutoSelect && !!markets[0]?.id;
  };

  const getEventStartDate = (eventId: number) => {
    const event = storeState.value[eventId]?.value;
    return typeof event?.startDate === "number"
      ? event.startDate
      : Number.MAX_SAFE_INTEGER;
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

  const sortFlatByStartDate = (items: FlatItem[], sport: string = "") => {
    const getLookupSport = (item: FlatItem) =>
      item.sport || (sport?.toLowerCase() ?? "");

    const getTopGroup = (item: FlatItem) =>
      getLeaguePriority(item.league, item.region, getLookupSport(item)) ===
      Infinity
        ? 1
        : 0;

    const getStartDate = (item: FlatItem) => {
      const event = storeState.value[item.id]?.value;
      return typeof event?.startDate === "number" ? event.startDate : null;
    };

    const isLoaded = (item: FlatItem) => getStartDate(item) !== null;

    return [...items].sort((a, b) => {
      // 1. Top leagues first
      const groupA = getTopGroup(a);
      const groupB = getTopGroup(b);
      if (groupA !== groupB) return groupA - groupB;

      // 2. Loaded events first
      const loadedA = isLoaded(a);
      const loadedB = isLoaded(b);
      if (loadedA !== loadedB) return loadedA ? -1 : 1;

      // 3. Sort by START TIME (primary sort within each group)
      const startA = getStartDate(a);
      const startB = getStartDate(b);
      if (startA !== null && startB !== null && startA !== startB)
        return startA - startB;

      // 4. League priority only as tiebreaker for same start time
      if (startA === startB) {
        const priorityA = getLeaguePriority(
          a.league,
          a.region,
          getLookupSport(a),
        );
        const priorityB = getLeaguePriority(
          b.league,
          b.region,
          getLookupSport(b),
        );
        if (priorityA !== priorityB) return priorityA - priorityB;
      }

      // 5. Final tiebreakers for unloaded events
      const regionCompare = a.region.localeCompare(b.region);
      if (regionCompare !== 0) return regionCompare;
      const leagueCompare = a.league.localeCompare(b.league);
      if (leagueCompare !== 0) return leagueCompare;
      return a.id - b.id;
    });
  };

  const flatList: FlatItem[] = (() => {
    /** Popular = featured matches only; ignores Live / Upcoming toggle */
    if (selectedSport === "Popular") {
      const list: FlatItem[] = [];
      const state = popularMatchesState.value;
      for (const sport of Object.keys(state)) {
        for (const region of Object.keys(state[sport] ?? {})) {
          for (const league of Object.keys(state[sport][region] ?? {})) {
            const ids = state[sport][region][league] ?? [];
            for (const id of ids) {
              list.push({
                id: id,
                region: region as string,
                league: league as string,
                sport: sport as string,
              });
            }
          }
        }
      }
      return sortFlatByStartDate(list, "");
    }

    if (matchView === "live") {
      const data = summarySportsLive.value.data?.[selectedSport];
      const list: FlatItem[] = [];
      if (data) {
        const regions = Object.keys(data).filter((r) => r !== "Esoccer");
        for (const region of regions) {
          const leagues = Object.keys(data[region] ?? {});
          for (const league of leagues) {
            const events = Object.values(data[region]?.[league] ?? {});
            for (const e of events) {
              list.push({
                id: e[0],
                region: region as string,
                league: league as string,
                sport: selectedSport as string,
              });
            }
          }
        }
      }
      return list;
    }

    const data = summarySports.value.data?.[selectedSport];
    const list: FlatItem[] = [];

    if (data) {
      const regions = Object.keys(data).filter((r) => r !== "Esoccer");
      for (const region of regions) {
        const leagues = Object.keys(data[region] ?? {});
        for (const league of leagues) {
          const events = Object.values(data[region]?.[league] ?? {});
          for (const e of events) {
            list.push({
              id: e[0],
              region: region as string,
              league: league as string,
              sport: selectedSport as string,
            });
          }
        }
      }
    }
    return sortFlatByStartDate(list, selectedSport);
  })();

  const isLiveMode = matchView === "live";

  const displayedEvents = useMemo(() => {
    const loaded = loadedCount[selectedSport] ?? 0;
    const candidates = flatList.slice(0, loaded);
    const validEvents = candidates.filter((item) => {
      const storedEvent = storeState.value[item.id]?.value;
      return !!storedEvent && (isLiveMode || isEventValidForDisplay(storedEvent));
    });
    if (validEvents.length > 0) {
      return validEvents;
    }
    const storedEvents = candidates.filter(
      (item) => !!storeState.value[item.id]?.value,
    );
    return storedEvents;
  }, [flatList, loadedCount, selectedSport, storeState.value, isLiveMode]);

  useEffect(() => {
    if (Object.keys(popularMatchesState.value).length > 0) return;
    (async () => {
      try {
        const res = await apiGetFeaturedMatches();
        popularMatchesState.value = (res ?? {}) as Record<
          string,
          Record<string, Record<string, number[]>>
        >;
        // popularMatchesState.value = { ...popularMatchesState.value };
      } catch (e) {
        console.error("Error fetching featured/popular matches:", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedSport === "Popular") return;
    setLoadedCount({});
    setLoadedSports({});
  }, [matchView, selectedSport]);

  // Initial load: fetch first 10 events for Popular or selected sport.
  // Do not depend on summarySports.value.data or flatList so polling does not re-run this.
  useEffect(() => {
    if (!loadedSidebarState.value) return;

    if (selectedSport === "Popular") {
      if (!popularMatchesState.value) return;
    } else if (matchView === "live") {
      if (!summarySportsLive.value.data) return;
      if (!summarySportsLive.value.data[selectedSport]) return;
    } else {
      if (!summarySports.value.data) return;
      if (!summarySports.value.data[selectedSport]) return;
    }

    const list = flatList;
    const firstBatch = list.slice(0, isLiveMode ? 10 : 100);
    if (firstBatch.length === 0) {
      setLoadingMatches(false);
      setLoading(false);
      setLoadedCount({ [selectedSport]: 0 });
      return;
    }
    const eventsTemp: Record<
      number,
      { region: string; league: string; sport: string }
    > = Object.fromEntries(
      firstBatch.map(({ id, region, league, sport }) => [
        id,
        { region, league, sport },
      ]),
    );

    setLoadedCount({ [selectedSport]: 0 });
    // setLoading(true);
    setLoadingMatches(
      !loadedSports[matchView === "live" ? "live" : "upcoming"]?.has(
        selectedSport,
      ),
    );

    const missingBatch = firstBatch;
    // const missingBatch = firstBatch.filter((x) => !storeState.value[x.id]);

    let cancelled = false;

    (async () => {
      try {
        if (missingBatch.length === 0) {
          setLoadedCount({ [selectedSport]: firstBatch.length });
          loadedPrematchState.value = true;
          loadedAllMatches.value = true;
          return;
        }

        if (!loadedSidebarState.value || (selectedSport !== "Popular" && pageName)) {
          return;
        }

        const ids = missingBatch.map((x) => x.id);
        const res =
          selectedSport.toLowerCase() === "popular"
            ? await apiGetMatchesAuto(ids)
            : await apiGetMatches(
                ids,
                matchView === "live" ? "InPlay" : "PreMatch",
                selectedSport,
              );
        if (cancelled) return;
        convertAndStoreEvent(
          isLiveMode
            ? res.data.sort((a, b) => (b[9] ?? 0) - (a[9] ?? 0))
            : res.data,
        );
        if (selectedSport.toLowerCase() !== "popular") {
          setSelectedMarkets(res.marketsMeta);
        }
        setLoadedCount({
          [selectedSport]: firstBatch.length,
        });
        loadedPrematchState.value = true;
        loadedAllMatches.value = true;
      } catch (err) {
        console.error("Error fetching prematch matches:", err);
      } finally {
        if (!cancelled) {
          setLoadingMatches(false);
          setLoading(false);
          setLoadedSports((prev) => ({
            ...prev,
            [matchView === "live" ? "live" : "upcoming"]: (
              prev[matchView === "live" ? "live" : "upcoming"] ?? new Set()
            ).add(selectedSport),
          }));
          loadedMatchesState.value = true;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    selectedSport,
    loadedSidebarState.value,
    popularMatchesState.value,
    matchView,
    isLiveMode,
  ]);

  const handleShowMore = useCallback(() => {
    (async () => {
      const current = loadedCount[selectedSport] ?? 0;
      if (loadingMore || current >= flatList.length) return;
      const nextBatch = flatList.slice(current, current + 10);
      if (nextBatch.length === 0) return;

      const missingBatch = nextBatch;
      // const missingBatch = nextBatch.filter((x) => !storeState.value[x.id]);
      if (missingBatch.length === 0) {
        setLoadedCount((prev) => ({
          ...prev,
          [selectedSport]: prev[selectedSport] + nextBatch.length,
        }));
        return;
      }

      setLoadingMore(true);
      const ids = missingBatch.map((x) => x.id);
      const res =
        selectedSport.toLowerCase() === "popular"
          ? await apiGetMatchesAuto(ids)
          : await apiGetMatches(
              ids,
              matchView === "live" ? "InPlay" : "PreMatch",
              selectedSport,
            );
      setLoadingMore(false);

      try {
        if (!res) return;
        convertAndStoreEvent(
          isLiveMode
            ? res.data.sort((a, b) => (b[9] ?? 0) - (a[9] ?? 0))
            : res.data,
        );
        setLoadedCount((prev) => ({
          ...prev,
          [selectedSport]: prev[selectedSport] + nextBatch.length,
        }));
      } catch (err) {
        console.error("Error fetching more prematch matches:", err);
      } finally {
        setLoadingMore(false);
      }
    })();
  }, [loadingMore, loadedCount, flatList, selectedSport, matchView, isLiveMode]);

  const handleSelectLiveView = useCallback(() => {
    setMatchView("live");
    if (selectedSport !== "Popular") return;
    const liveSports = Object.keys(summarySportsLive.value.data ?? {});
    setSelectedSport(liveSports[0] ?? "Soccer");
  }, [selectedSport]);

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

  useEffect(() => {
    if (matchView === "live" && selectedSport !== "Popular") {
      const liveData = summarySportsLive.value.data ?? {};

      setSportsData(
        Object.keys(liveData).map((sport) => ({
          count: Object.values(liveData[sport] ?? {}).reduce(
            (acc, regionObj) =>
              acc +
              Object.values(regionObj ?? {}).reduce(
                (a, leagueObj) => a + Object.keys(leagueObj ?? {}).length,
                0,
              ),
            0,
          ),
          name: sport,
          slug: sport,
        })),
      );
      return;
    }
    setSportsData(
      Object.keys(summarySports.value.data).map((sport) => ({
        count: Object.values(summarySports.value.data[sport]).reduce(
          (acc, region) =>
            acc +
            Object.values(region).reduce(
              (acc, league) => acc + Object.keys(league).length,
              0,
            ),
          0,
        ),
        name: sport,
        slug: sport,
      })) || [],
    );
  }, [summarySports.value, summarySportsLive.value, matchView, selectedSport]);

  useEffect(() => {
    if (sportsData.length > 0 && !isSportsListInitialized) {
      setIsSportsListInitialized(true);
    }
  }, [sportsData, isSportsListInitialized]);

  return (
    <div
      className={`overflow-hidden flex w-full flex-col gap-2 md:p-2 rounded-[16px] bg-[var(--background-element)] transition-all duration-300 ease-in-out text-[var(--text-basic-color)]`}
    >
      <div className="flex flex-col w-full sticky top-0">
        <div className="flex w-full pt-4 pb-2 px-2 items-center justify-between">
          <span className="text-[20px] font-bold">{t("Join-the-action")}</span>
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
          {/* <div className="flex items-center gap-2">
            <span className="text-[12px] text-[var(--text-secondary-color)] rounded-full cursor-default bg-[var(--sub-element-secondary)] px-2 py-1">
              {summarySports.value.counts[selectedSport]?.total} {tCommon("liveMatches")}
            </span>
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/arrow.png`}
              className="w-[12px] h-[12px] object-contain cursor-pointer"
              alt="arrow"
              onClick={() => setLocation("/event-view/live")}
            />
          </div> */}
        </div>

        <SportsList
          sportsData={sportsData}
          selectedSport={selectedSport}
          onSelectSport={(sport) => setSelectedSport(sport)}
          loading={loading && !isSportsListInitialized}
          isLive={selectedSport === "Popular" ? false : matchView === "live"}
          showPopular={true}
        />
        {selectedSport !== "Popular" && (
          <MarketNavigation
            options={selectedMarkets}
            selectedValue={selectedMarketName}
            onSelect={setselectedMarketName}
          />
        )}
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
          {/* <MarketNavigation
            options={selectedMarekts}
            selectedValue={selectedMarketName}
            onSelect={setselectedMarketName}
          /> */}
          <div className="flex flex-col mt-1 rounded-[4px]">
            <>
              {displayedEvents.length === 0 ? (
                <div className="px-2 py-2">{tCommon("noDataAvailable")}</div>
              ) : (
                displayedEvents.map((event) => {
                  const storedEvent = storeState.value[event.id]?.value;
                  if (
                    !storedEvent ||
                    (!isLiveMode && !isEventValidForDisplay(storedEvent))
                  )
                    return null;
                  const isMoneyline =
                    storedEvent.sport === "Basketball" ||
                    storedEvent.sport === "Ice Hockey";
                  const marketSlug = isLiveMode
                    ? selectedMarketName || selectedMarkets[0] || ""
                    : selectedMarketName;
                  const marketId =
                    !isLiveMode
                      ? (getMarketId({
                          eventId: event.id,
                          marketSlug,
                          autoSelect: true,
                        }) ?? "")
                      : "";
                  const canRenderLiveMatch =
                    !isLiveMode ||
                    isMoneyline ||
                    liveMatchWouldRender(storedEvent, marketSlug, true);
                  if (!canRenderLiveMatch) return null;
                  return (
                    <div
                      key={event.id}
                      className={`flex rounded-[8px] overflow-hidden ${
                        !isLiveMode && !marketId && !isMoneyline
                          ? "hidden"
                          : "flex mb-2"
                      }`}
                    >
                      {isMoneyline ? (
                        <MoneylineMatch eventId={event.id} />
                      ) : (
                        <Match
                          eventId={event.id}
                          marketSlug={marketSlug}
                          marketId={isLiveMode ? undefined : marketId}
                          showLeagueLogo={true}
                          allowAutoSelect={selectedSport === "Popular" || isLiveMode}
                          allowRounded={true}
                        />
                      )}
                    </div>
                  );
                })
              )}
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
            </>
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
