import { FunctionComponent } from "preact";
import { apiGetMatches } from "@/api/matches/apiGetMatches";
import { useTranslate } from "@/shared/i18n/i18n";
import { summarySportsLive } from "@/state/summarySports";
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
import { BASE_ASSET_PUBLIC_URL, getAppConfig } from "@/shared/config/appConfig";
import { useRouteParams } from "@/hooks/useRotueParams";
import { useLocation } from "wouter-preact";
import { storeState } from "@/state/storeState";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { loadedAllMatches } from "@/state/loadedAllMatches";
import { Match } from "../MatchesBoard/components/Match";
import { getTranslate, getTranslatedText } from "@/helpers/getTranslate";
import InfiniteScroll from "react-infinite-scroll-component";
import { MarketNavigation } from "../marketNavigation";
import { baseColorTheme } from "@/state/baseColorTheme";
import { storeEvent } from "@/helpers/storeEvent";
import type { tEventModel } from "@/types/typesForSocket.ts/tEventModel";
import { firstEventState } from "@/state/firstEventState";

/** React lib used under Preact; cast for JSX compatibility */
const InfiniteScrollComponent = InfiniteScroll as any;

/** Same resolution as `Match` so we only render region/league rows that show at least one match. */
function liveMatchWouldRender(
  event: tEventModel | undefined,
  marketSlug: string,
  allowAutoSelect: boolean,
): boolean {
  if (!event?.markets) return false;
  const markets = Object.values(event.markets).map((sig) => sig.value);
  if (!markets.length) return false;
  if (markets.find((m) => m.name === marketSlug)?.id) return true;
  return allowAutoSelect && !!markets[0]?.id;
}

export const LiveMatchesPanel: FunctionComponent = () => {
  const { t: tCommon } = useTranslate("common");
  const [, setLocation] = useLocation();
  const baseTheme = baseColorTheme.value;
  const [selectedSport, setSelectedSport] = useState<number>(1);

  const pendingDeleteRef = useRef<number[]>([]);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMarketSlug, setSelectedMarketSlug] = useState<string>("");
  const [sportsData, setSportsData] = useState<
    { count: number; name: string; id: number }[]
  >([]);
  const { pageName } = useRouteParams();
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);

  console.log("rendering live ......");

  useEffect(() => {
    if (!selectedMarkets.length) return;
    setSelectedMarketSlug((prev) =>
      prev && selectedMarkets.includes(prev)
        ? prev
        : (selectedMarkets[0] ?? ""),
    );
  }, [selectedMarkets]);

  // useEffect(() => {
  //   (async () => {
  //     const lang = getAppConfig().lang;
  //     if (lang === "en") return;
  //     const data = summarySportsLive.value.data;
  //     if (!data?.length) return;
  //     const sourceTexts: string[] = [];
  //     for (const sport of data) {
  //       sourceTexts.push(sport[1]);
  //       for (const region of sport[2] ?? []) {
  //         sourceTexts.push(region[1]);
  //         for (const league of region[2] ?? []) {
  //           sourceTexts.push(league[1]);
  //         }
  //       }
  //     }
  //     await getTranslate(sourceTexts);
  //   })();
  // }, [summarySportsLive.value]);

  const sportRegions = useMemo(() => {
    return (
      summarySportsLive.value.data?.find((s) => s[0] === selectedSport)?.[2] ??
      []
    );
  }, [selectedSport, summarySportsLive.value.data]);

  const selectedSportName = useMemo(() => {
    return (
      summarySportsLive.value.data?.find((s) => s[0] === selectedSport)?.[1] ??
      ""
    );
  }, [selectedSport, summarySportsLive.value.data]);

  const flatList = useMemo(() => {
    const flat: number[] = [];
    for (const region of sportRegions) {
      for (const league of region[2] ?? []) {
        flat.push(...league[2]);
      }
    }
    return flat;
  }, [sportRegions]);

  const groupedLimited = useMemo(() => {
    const grouped: Record<number, Record<number, number[]>> = {};
    let count = 0;
    outer: for (const region of sportRegions) {
      const regionId = region[0];
      for (const league of region[2] ?? []) {
        const leagueId = league[0];
        if (count >= loadedCount) break outer;
        if (!grouped[regionId]) grouped[regionId] = {};
        if (!grouped[regionId][leagueId]) grouped[regionId][leagueId] = [];
        grouped[regionId][leagueId].push(...league[2]);
        count++;
      }
    }
    return grouped;
  }, [sportRegions, loadedCount]);

  // const selectedMarkets = useMemo(() => {
  //   return (
  //     summarySportsLive.value.config.find(
  //       (s) =>
  //         s.sportSlug ===
  //         slugify(selectedSport, { lower: true, trim: true, strict: true }),
  //     )?.selectedMarkets || []
  //   );
  // }, [selectedSport, summarySportsLive.value]);

  // useEffect(() => {
  //   setSelectedMarketSlug(
  //     selectedMarekts.length > 0 ? selectedMarekts[0] || "" : "",
  //   );
  // }, [selectedMarkets.length]);

  // Fetch first 10 live matches when sport/data is ready.
  useEffect(() => {
    pendingDeleteRef.current = [];
    if (!loadedSidebarState.value || !summarySportsLive.value.data) return;

    const firstBatch = flatList.slice(0, 10);
    const eventIds = firstBatch;

    setLoadedCount(0);
    setSelectedMarkets([]);
    setSelectedMarketSlug("");

    // No live events for the selected sport — turn off the loaders so the
    // SportsList can render its tabs (and the panel its empty state) instead
    // of staying stuck on a skeleton.
    if (eventIds.length === 0) {
      setLoadingMatches(false);
      setLoading(false);
      return;
    }

    pendingDeleteRef.current = [...eventIds];
    let cancelled = false;

    setLoading(true);
    // setLoadingMatches(true);

    (async () => {
      try {
        const events = await apiGetMatches(eventIds);
        if (cancelled) return;
        const sorted = (events ?? []).sort(
          (a, b) =>
            new Date(b.eventInfo.startTime).getTime() -
            new Date(a.eventInfo.startTime).getTime(),
        );
        sorted.forEach((event) => storeEvent(event));
        setLoadedCount(eventIds.length);
        loadedAllMatches.value = true;
      } catch (err) {
        console.error("Error fetching live matches:", err);
      } finally {
        if (!cancelled) {
          setLoadingMatches(false);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      pendingDeleteRef.current.forEach((id) => {
        delete storeState.value[id];
      });
      pendingDeleteRef.current = [];
    };
  }, [
    selectedSport,
    pageName,
    loadedSidebarState.value,
    sportRegions,
    flatList,
  ]);

  useEffect(() => {
    const data = summarySportsLive.value.data ?? [];
    setSportsData(
      data.map((sport) => {
        const sportId = sport[0];
        const sportName = sport[1];
        const count = (sport[2] ?? []).reduce(
          (sum, region) =>
            sum +
            (region[2] ?? []).reduce(
              (lsum, league) => lsum + (league[2] ?? []).length,
              0,
            ),
          0,
        );
        return { count, name: sportName, id: sportId };
      }),
    );
  }, [summarySportsLive.value]);

  useEffect(() => {
    const marketSlugForVisibility =
      selectedMarketSlug || selectedMarkets[0] || "";
    if (!marketSlugForVisibility) return;

    const loadedIds = flatList.slice(0, loadedCount);
    const firstVisibleId =
      loadedIds.find((id) =>
        liveMatchWouldRender(
          storeState.value[id]?.value,
          marketSlugForVisibility,
          true,
        ),
      ) ?? null;

    if (firstVisibleId != null) {
      firstEventState.value = [selectedSportName, firstVisibleId];
    }
  }, [
    selectedSport,
    selectedSportName,
    selectedMarketSlug,
    selectedMarkets,
    flatList,
    loadedCount,
  ]);

  const loadMore = useCallback(() => {
    if (loadingMore || loadedCount >= flatList.length) return;
    const nextBatch = flatList.slice(loadedCount, loadedCount + 10);
    if (nextBatch.length === 0) return;
    const eventIds = nextBatch;
    setLoadingMore(true);
    apiGetMatches(eventIds)
      .then((events) => {
        const sorted = (events ?? []).sort(
          (a, b) =>
            new Date(b.eventInfo.startTime).getTime() -
            new Date(a.eventInfo.startTime).getTime(),
        );
        sorted.forEach((event) => storeEvent(event));
        setLoadedCount((prev) => prev + nextBatch.length);
      })
      .catch((err) => console.error("Error fetching more live matches:", err))
      .finally(() => setLoadingMore(false));
  }, [loadingMore, loadedCount, flatList, selectedSport]);

  const infiniteLoader = (
    <div className="flex flex-col gap-[2px] py-[2px]">
      <UpcomingMatchSkeleton />
      <UpcomingMatchSkeleton />
      <UpcomingMatchSkeleton />
    </div>
  ) as any;

  return (
    <div
      className={`overflow-hidden flex w-full flex-col gap-2 md:p-2 rounded-[16px] bg-[var(--background-color)] transition-all duration-300 ease-in-out text-[var(--text-basic-color)]`}
    >
      <InfiniteScrollComponent
        dataLength={loadedCount}
        next={loadMore}
        hasMore={loadedCount < flatList.length}
        loader={infiniteLoader}
      >
        <div className="flex flex-col w-full sticky top-0">
          <div className="flex w-full pt-4 pb-2 px-2 items-center">
            <div className="flex flex-1 items-center gap-2">
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/live.png`}
                className={`w-[24px] h-[24px] object-contain ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
              />
              <span className="text-[20px] font-bold">
                {tCommon("liveMatches")}({summarySportsLive.value.TotalCount})
              </span>
            </div>
            {pageName !== "live" && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[var(--text-secondary-color)] font-bold rounded-full cursor-default bg-[var(--sub-element-secondary)] px-2 py-1">
                  {summarySportsLive.value.TotalCount} {tCommon("liveMatches")}
                </span>
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/arrow.png`}
                  className={`w-[12px] h-[12px] object-contain cursor-pointer ${pageName === "live" && "hidden"} ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                  alt="arrow"
                  onClick={() => {
                    if (pageName !== "live") {
                      setLocation("/event-view/live");
                    }
                  }}
                />
              </div>
            )}
          </div>
          <SportsList
            sportsData={sportsData}
            selectedSport={selectedSport}
            onSelectSport={(sportId) => {
              const sport = summarySportsLive.value.data?.find(
                (s) => s[0] === sportId,
              );
              if (sport != null) setSelectedSport(sport[0]);
            }}
            loading={loadingMatches}
            isLive={true}
          />
        </div>
        {loading ? (
          <LiveMatchesPanelLoader showMarketTabs={pageName === "live"} />
        ) : (
          <>
            <MarketNavigation
              options={
                selectedMarkets.length > 0
                  ? selectedMarkets
                  : ["Winner", "Total", "Handicap"]
              }
              selectedValue={selectedMarketSlug || selectedMarkets[0] || ""}
              onSelect={setSelectedMarketSlug}
            />
            <div className="flex flex-col mt-1 rounded-[4px]">
              <>
                {flatList.length === 0 ? (
                  <div className="px-2 py-2">{tCommon("noDataAvailable")}</div>
                ) : (
                  Object.entries(groupedLimited).flatMap(
                    ([regionId, leagues]) =>
                      Object.entries(leagues).map(([leagueId, eventIds]) => {
                        const visibleEventIds = eventIds.filter(
                          (id) =>
                            storeState.value[id] &&
                            liveMatchWouldRender(
                              storeState.value[id]?.value,
                              selectedMarketSlug,
                              true,
                            ),
                        );
                        if (visibleEventIds.length === 0) return null;
                        return (
                          <div
                            key={`${regionId}-${leagueId}`}
                            className={`flex flex-col md:px-[5px]`}
                          >
                            <button
                              className={`flex items-center h-[34px] justify-start py-2 transition-colors w-full`}
                            >
                              <div className="flex items-center text-[12px] md:px-2 pb-1 pt-2 gap-2 flex-1 min-w-0">
                                <img
                                  src={`${BASE_ASSET_PUBLIC_URL}/icons/star.png`}
                                  className={`w-[16px] h-[16px] object-contain ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                                />
                                <span className="flex-1 text-left truncate min-w-0">
                                  {summarySportsLive.value.data
                                    ?.find((s) => s[0] === selectedSport)?.[2]
                                    ?.find(
                                      (r) => r[0] === Number(regionId),
                                    )?.[1] ?? regionId}
                                  {" - "}
                                  {summarySportsLive.value.data
                                    ?.find((s) => s[0] === selectedSport)?.[2]
                                    ?.find(
                                      (r) => r[0] === Number(regionId),
                                    )?.[2]
                                    ?.find(
                                      (l) => l[0] === Number(leagueId),
                                    )?.[1] ?? leagueId}
                                </span>
                              </div>
                            </button>

                            <div className="overflow-hidden transition-all duration-300 ease-in-out">
                              <div className="flex flex-col w-full h-full gap-[2px] py-[2px]">
                                <div
                                  className={`flex flex-col mt-[2px] rounded-[8px] overflow-hidden border-[1px] w-full border-[var(--border-color)] bg-[var(--sub-element-color)]`}
                                >
                                  {visibleEventIds.map((eventId) => (
                                    <Match
                                      key={eventId}
                                      eventId={eventId}
                                      allowAutoSelect={true}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }),
                  )
                )}
              </>
            </div>
          </>
        )}
      </InfiniteScrollComponent>
    </div>
  );
};
