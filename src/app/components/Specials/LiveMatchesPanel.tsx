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
import { convertAndStoreEvent } from "@/helpers/convertAndStoreEvent";
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
  const [selectedSport, setSelectedSport] = useState<string>("Soccer");

  const pendingDeleteRef = useRef<number[]>([]);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMarketSlug, setSelectedMarketSlug] = useState<string>("");
  const [sportsData, setSportsData] = useState<
    { count: number; name: string; slug: string }[]
  >([]);
  const { pageName } = useRouteParams();
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedMarkets.length) return;
    setSelectedMarketSlug((prev) =>
      prev && selectedMarkets.includes(prev)
        ? prev
        : (selectedMarkets[0] ?? ""),
    );
  }, [selectedMarkets]);

  useEffect(() => {
    (async () => {
      const lang = getAppConfig().lang;
      if (lang === "en") return;
      const data = summarySportsLive.value.data;
      if (!data) return;
      const sourceTexts = [
        ...Object.keys(data),
        ...Object.values(data).flatMap((sport) => Object.keys(sport)),
        ...Object.values(data).flatMap((sport) =>
          Object.values(sport).flatMap((region) => Object.keys(region)),
        ),
      ];
      await getTranslate(sourceTexts);
    })();
  }, [summarySportsLive.value]);

  const flatList = useMemo(() => {
    const data = summarySportsLive.value.data?.[selectedSport];
    if (!data) return [];
    const regions = Object.keys(data).filter((r) => r !== "Esoccer");
    const flat: { id: number; region: string; league: string }[] = [];
    for (const region of regions) {
      const leagues = Object.keys(data[region] ?? {});
      for (const league of leagues) {
        const events = Object.values(data[region]?.[league] ?? {});
        for (const e of events) flat.push({ id: e[0], region, league });
      }
    }
    return flat;
  }, [selectedSport, summarySportsLive.value.data]);

  const groupedLimited = useMemo(() => {
    const limited = flatList.slice(0, loadedCount);
    const grouped: Record<string, Record<string, { id: number }[]>> = {};
    for (const { id, region, league } of limited) {
      if (!grouped[region]) grouped[region] = {};
      if (!grouped[region][league]) grouped[region][league] = [];
      grouped[region][league].push({ id });
    }
    return grouped;
  }, [flatList, loadedCount]);

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
    const data = summarySportsLive.value.data[selectedSport];
    if (!data) return;

    const regions = Object.keys(data).filter((r) => r !== "Esoccer");
    const flat: { id: number; region: string; league: string }[] = [];
    for (const region of regions) {
      const leagues = Object.keys(data[region] ?? {});
      for (const league of leagues) {
        const events = Object.values(data[region]?.[league] ?? {});
        for (const e of events) flat.push({ id: e[0], region, league });
      }
    }

    const firstBatch = flat.slice(0, 10);
    const eventIds = firstBatch.map((x) => x.id);

    setLoadedCount(0);
    setSelectedMarkets([]);
    setSelectedMarketSlug("");

    if (eventIds.length === 0) {
      setLoadingMatches(false);
      setLoading(false);
      return;
    }

    pendingDeleteRef.current = [...eventIds];
    let cancelled = false;

    setLoading(true);
    setLoadingMatches(true);

    (async () => {
      try {
        const res = await apiGetMatches(eventIds, "InPlay", selectedSport);
        if (cancelled) return;
        convertAndStoreEvent(
          res.data.sort((a, b) => (b[9] ?? 0) - (a[9] ?? 0)),
        );
        if (res.marketsMeta?.length) {
          setSelectedMarkets(res.marketsMeta);
        }
        setLoadedCount(10);
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
  }, [selectedSport, pageName, loadedSidebarState.value]);

  useEffect(() => {
    setSportsData(
      Object.keys(summarySportsLive.value.data).map((sport) => ({
        count: Object.values(summarySportsLive.value.data[sport]).reduce(
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
  }, [summarySportsLive.value]);

  useEffect(() => {
    const marketSlugForVisibility =
      selectedMarketSlug || selectedMarkets[0] || "";
    if (!marketSlugForVisibility) return;

    const loadedIds = flatList.slice(0, loadedCount).map((x) => x.id);
    const firstVisibleId =
      loadedIds.find((id) =>
        liveMatchWouldRender(
          storeState.value[id]?.value,
          marketSlugForVisibility,
          false,
        ),
      ) ?? null;

    if (firstVisibleId != null) {
      firstEventState.value = [selectedSport, firstVisibleId];
    }
  }, [
    selectedSport,
    selectedMarketSlug,
    selectedMarkets,
    flatList,
    loadedCount,
  ]);

  const loadMore = useCallback(() => {
    if (loadingMore || loadedCount >= flatList.length) return;
    const nextBatch = flatList.slice(loadedCount, loadedCount + 10);
    if (nextBatch.length === 0) return;
    const eventIds = nextBatch.map((x) => x.id);
    setLoadingMore(true);
    apiGetMatches(eventIds, "InPlay", selectedSport)
      .then((res) => {
        convertAndStoreEvent(
          res.data.sort((a, b) => (b[9] ?? 0) - (a[9] ?? 0)),
        );
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
                {tCommon("liveMatches")}(
                {summarySportsLive.value.liveTotalCount})
              </span>
            </div>
            {pageName !== "live" && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[var(--text-secondary-color)] font-bold rounded-full cursor-default bg-[var(--sub-element-secondary)] px-2 py-1">
                  {summarySportsLive.value.liveTotalCount}{" "}
                  {tCommon("liveMatches")}
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
            onSelectSport={(sport) => setSelectedSport(sport)}
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
                  Object.keys(groupedLimited)
                    .map((region) =>
                      Object.keys(groupedLimited[region]).map((league) => {
                        const eventIds = Object.values(
                          groupedLimited[region][league],
                        ).map((event) => event.id);
                        const existEvents = Object.keys(
                          storeState.value,
                        ).filter((id) => eventIds.includes(parseInt(id, 10)));
                        const visibleEvents = existEvents.filter((idStr) =>
                          liveMatchWouldRender(
                            storeState.value[parseInt(idStr, 10)]?.value,
                            selectedMarketSlug,
                            false,
                          ),
                        );
                        if (visibleEvents.length === 0) return null;
                        return (
                          <div
                            key={`${region}-${league}`}
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
                                  {getTranslatedText(region || "")}
                                  {" - "}
                                  {getTranslatedText(league || "")}
                                </span>
                              </div>
                            </button>

                            <div className="overflow-hidden transition-all duration-300 ease-in-out">
                              <div className="flex flex-col w-full h-full gap-[2px] py-[2px]">
                                <div
                                  className={`flex flex-col mt-[2px] rounded-[8px] overflow-hidden border-[1px] w-full border-[var(--border-color)] bg-[var(--sub-element-color)]`}
                                >
                                  {visibleEvents.map((event) => (
                                    <Match
                                      key={event}
                                      eventId={parseInt(event, 10)}
                                      marketSlug={selectedMarketSlug}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }),
                    )
                    .flat()
                )}
              </>
            </div>
          </>
        )}
      </InfiniteScrollComponent>
    </div>
  );
};
