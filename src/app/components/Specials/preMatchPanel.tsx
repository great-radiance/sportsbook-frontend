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

import { baseColorTheme } from "@/state/baseColorTheme";
import { useRouteParams } from "@/hooks/useRotueParams";
import { convertAndStoreEvent } from "@/helpers/convertAndStoreEvent";
import { MarketNavigation } from "../marketNavigation";
import { getMarketId } from "@/hooks/useGetMarketId";
import { MoneylineMatch } from "../MatchesBoard/components/Match/MoneylineMatch";

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

  type Grouped = Record<string, Record<string, { id: number }[]>>;

  const fromFlat = (flat: FlatItem[]): Grouped => {
    const out: Grouped = {};
    for (const { id, region, league } of flat) {
      if (!out[region]) out[region] = {};
      if (!out[region][league]) out[region][league] = [];
      out[region][league].push({ id });
    }
    return out;
  };

  const getEventStartDate = (eventId: number) => {
    const event = storeState.value[eventId]?.value;
    return typeof event?.startDate === "number"
      ? event.startDate
      : Number.MAX_SAFE_INTEGER;
  };

  const sortFlatByStartDate = (items: FlatItem[]) =>
    [...items].sort((a, b) => {
      const aDate = getEventStartDate(a.id);
      const bDate = getEventStartDate(b.id);
      return aDate - bDate || a.id - b.id;
    });

  const flatList = useMemo((): FlatItem[] => {
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
      // if (matchView === "live") {
      //   console.log(`====live`, list);
      //   for (const item of list) {
      //     console.log(
      //       `====summarySportsLive.value.data?.[${item.sport}]?.[${item.region}]?.[${item.league}]?.[${item.id}]`,
      //       summarySportsLive.value.data?.[item.sport]?.[item.region]?.[
      //         item.league
      //       ],
      //     );
      //   }
      //   const filteredList = list.filter(
      //     (item) =>
      //       !!summarySportsLive.value.data?.[item.sport]?.[item.region]?.[
      //         item.league
      //       ]?.[item.id],
      //   );
      //   console.log(`====filteredList`, filteredList);
      //   return filteredList;
      // }
      // if (matchView === "upcoming") {
      //   console.log(`====upcoming`, list);
      //   const filteredList = list.filter(
      //     (item) =>
      //       !!summarySports.value.data?.[item.sport]?.[item.region]?.[
      //         item.league
      //       ]?.[item.id],
      //   );
      //   console.log(`====filteredList`, filteredList);
      //   return filteredList;
      // }
      return sortFlatByStartDate(list);
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
      return sortFlatByStartDate(list);
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
    return sortFlatByStartDate(list);
  }, [
    matchView,
    selectedSport,
    summarySports.value.data,
    summarySportsLive.value.data,
    popularMatchesState.value,
  ]);

  const groupedLimited = useMemo(
    () => fromFlat(flatList.slice(0, loadedCount[selectedSport] ?? 0)),
    [flatList, loadedCount, selectedSport],
  );

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
      if (!summarySports.value.data) return;
      if (!popularMatchesState.value) return;
    } else if (matchView === "live") {
      if (!summarySportsLive.value.data) return;
      if (!summarySportsLive.value.data[selectedSport]) return;
    } else {
      if (!summarySports.value.data) return;
      if (!summarySports.value.data[selectedSport]) return;
    }

    const list = flatList;
    const firstBatch = list.slice(0, 10);
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

        if (
          !loadedSidebarState.value ||
          !popularMatchesState.value ||
          pageName
        ) {
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
        convertAndStoreEvent(res.data);
        if (selectedSport.toLowerCase() !== "popular") {
          setSelectedMarkets(res.marketsMeta);
        }
        setLoadedCount({ [selectedSport]: firstBatch.length });
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
        convertAndStoreEvent(res.data);
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
  }, [loadingMore, loadedCount, flatList, selectedSport, matchView]);

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
                onClick={() => setMatchView("live")}
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
                onClick={() => setMatchView("upcoming")}
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
                  onClick={() => setMatchView("")}
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
          loading={loading}
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
      {loadingMatches && (loadedCount[selectedSport] ?? 0) === 0 ? (
        <LiveMatchesPanelLoader showMarketTabs={false} />
      ) : (
        <>
          {/* <MarketNavigation
            options={selectedMarekts}
            selectedValue={selectedMarketName}
            onSelect={setselectedMarketName}
          /> */}
          <div className="flex flex-col mt-1 rounded-[4px]">
            <>
              {flatList.length === 0 ? (
                <div className="px-2 py-2">{tCommon("noDataAvailable")}</div>
              ) : (
                Object.keys(groupedLimited)
                  .map((region) =>
                    Object.keys(groupedLimited[region]).map((league) => {
                      const eventIds = Object.values(
                        groupedLimited[region][league],
                      ).map((event) => event.id);
                      const existEvents = Object.keys(storeState.value).filter(
                        (id) => eventIds.includes(parseInt(id)),
                      );
                      if (existEvents.length === 0) return null;

                      return (
                        <>
                          {groupedLimited[region][league].map((event) => {
                            if (!storeState.value[event.id]) return null;
                            const isMoneyline =
                              storeState.value[event.id]?.value?.sport ===
                                "Basketball" ||
                              storeState.value[event.id]?.value?.sport ===
                                "Ice Hockey";
                            const marketId =
                              getMarketId({
                                eventId: event.id,
                                marketSlug: selectedMarketName,
                                autoSelect: true,
                              }) ?? "";
                            console.log("marketId", marketId);
                            return (
                              <div
                                // key={event.id}
                                className={`flex rounded-[8px] overflow-hidden ${
                                  !marketId && !isMoneyline
                                    ? "hidden"
                                    : "flex mb-2"
                                }`}
                                style={{
                                  order: getEventStartDate(event.id),
                                }}
                              >
                                {isMoneyline ? (
                                  <MoneylineMatch eventId={event.id} />
                                ) : (
                                  <Match
                                    key={`${event.id}-${region}-${league}`}
                                    eventId={event.id}
                                    marketSlug={selectedMarketName}
                                    marketId={marketId}
                                    // isLive={true}
                                    showLeagueLogo={true}
                                    allowAutoSelect={
                                      selectedSport === "Popular"
                                    }
                                    allowRounded={true}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </>
                      );
                    }),
                  )
                  .flat()
              )}
              {loadingMore && (
                <div
                  className="flex flex-col gap-[2px] py-[2px] mt-1"
                  style={{ order: 999 }}
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
