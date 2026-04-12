import { FunctionComponent } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";

import { isMobile } from "@/state/isMobile";
import { useTranslate } from "@/shared/i18n/i18n";
import { apiGetUpcomingMatches } from "@/api/special-matches/apiGetUpcomingMatches";
import { tGetUpcomingMatchesResponse } from "@/api/special-matches/apiGetUpcomingMatches";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { Select, SelectItem } from "../Select";
import { SportsList } from "../SportsList";
import { UpcomingMatchesLoader, UpcomingMatchSkeleton } from "../Loading";
import { tParticipant, tMarket, tOdd } from "@/types/tEvent";
import { getTeamlogosByArray } from "@/helpers/getTeamlogos";
import { getTranslate } from "@/helpers/getTranslate";
import { getAppConfig } from "@/shared/config/appConfig";
import { storeEvent } from "@/helpers/storeEvent";
import { MarketNavigation } from "../marketNavigation";
import { Match } from "../MatchesBoard/components/Match";
import { summarySports } from "@/state/summarySports";

const PAGE_SIZE = 10;
const FALLBACK_MARKET_OPTIONS = ["Winner", "Total", "Handicap"];

function appendUniqueIds(existing: number[], chunk: number[]): number[] {
  const seen = new Set(existing);
  const next = [...existing];
  for (const id of chunk) {
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

export const UpcomingMatches: FunctionComponent = () => {
  const { t: tCommon } = useTranslate("common");

  const timeFilterOptions: Record<
    number,
    { id: number; name: string; value: number }
  > = {
    1: { id: 1, name: "3 hours", value: 3 },
    2: { id: 2, name: "12 hours", value: 12 },
    3: { id: 3, name: "24 hours", value: 24 },
  };
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<number>(
    timeFilterOptions[1].value,
  );
  const [selectedMarket, setSelectedMarket] = useState<string>("winner");
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(false);
  /** Ordered event ids loaded per sport (accumulated via load more). */
  const [eventIdsBySport, setEventIdsBySport] = useState<
    Record<string, number[]>
  >({});
  /** Whether more pages exist for each sport (last page was full). */
  const [hasMoreBySport, setHasMoreBySport] = useState<Record<string, boolean>>(
    {},
  );
  /** marketsMeta from API, keyed by sport (same lifecycle as eventIdsBySport). */
  const [marketsMetaBySport, setMarketsMetaBySport] = useState<
    Record<string, string[]>
  >({});
  const [upcomingSummaryCount, setUpcomingSummaryCount] = useState<
    { count: number; name: string; slug: string }[]
  >([]);
  const [selectedSport, setSelectedSport] = useState<string>("Soccer");
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const initialFetchGenRef = useRef(0);
  const loadMoreGenRef = useRef(0);
  const eventIdsBySportRef = useRef(eventIdsBySport);
  eventIdsBySportRef.current = eventIdsBySport;
  const prevTimeFilterRef = useRef(selectedTimeFilter);

  const processAndStoreEvents = (res: tGetUpcomingMatchesResponse) => {
    const participantNames: Record<string, string[]> = {};

    for (const [
      id,
      sport,
      region,
      league,
      participants,
      outright,
      sportRadarId,
      markets,
      status,
      startDate,
    ] of res.map ?? []) {
      const participantsTemp: tParticipant[] = [];
      for (const [name, home] of participants ?? []) {
        participantsTemp.push({ name, home });
      }

      const marketsTemp: tMarket[] = [];
      for (const [
        marketId,
        name,
        odds,
        status,
        sort,
        column,
        groups,
      ] of markets ?? []) {
        const oddsTemp: tOdd[] = [];
        for (const [
          oddId,
          value,
          impliedOdd,
          mv,
          column,
          status,
          name,
          sort,
        ] of odds ?? []) {
          oddsTemp.push({
            id: oddId ?? "",
            value: value ?? 0,
            status: status ?? "",
            mv: mv ?? 0,
            impliedOdd: impliedOdd ?? null,
            name: name ?? "",
            column: column ?? 0,
            sort: sort ?? 0,
          });
        }
        marketsTemp.push({
          id: marketId ?? "",
          name: name ?? "",
          status: status ?? "",
          sort: sort ?? 0,
          column: column ?? 0,
          groups: groups ?? [],
          odds: oddsTemp ?? [],
        });
      }
      storeEvent({
        id: id ?? 0,
        sport: sport ?? "",
        region: region ?? "",
        league: league ?? "",
        participants: participantsTemp ?? [],
        outright: outright ?? false,
        sportRadarId: sportRadarId ?? 0,
        markets: marketsTemp ?? [],
        status: status ?? "",
        startDate: startDate ?? 0,
      });
      (participantsTemp ?? []).forEach((p) => {
        if (p?.name && sport) {
          if (!participantNames[sport]) {
            participantNames[sport] = [];
          }
          participantNames[sport].push(p.name);
        }
      });
    }

    if (
      getAppConfig().lang !== "en" &&
      Object.values(participantNames).flat().length > 0
    ) {
      getTranslate(Object.values(participantNames).flat());
    }
    for (const sport of Object.keys(participantNames)) {
      if (participantNames[sport].length > 0) {
        void getTeamlogosByArray(sport, participantNames[sport]);
      }
    }
  };

  const applyPageResult = (
    sportKey: string,
    res: tGetUpcomingMatchesResponse,
    mode: "replace" | "append",
  ) => {
    const chunkIds = (res.map ?? []).map((row) => row[0] ?? 0);

    processAndStoreEvents(res);

    if (res.marketsMeta?.length) {
      setMarketsMetaBySport((prev) => ({
        ...prev,
        [sportKey]: res.marketsMeta,
      }));
    }

    setEventIdsBySport((prev) => {
      const existing = prev[sportKey] ?? [];
      const nextIds =
        mode === "replace" ? chunkIds : appendUniqueIds(existing, chunkIds);
      return { ...prev, [sportKey]: nextIds };
    });

    setHasMoreBySport((prev) => ({
      ...prev,
      [sportKey]: (res.map?.length ?? 0) >= PAGE_SIZE,
    }));
  };

  /**
   * First page (10 events): when sidebar is ready and either the time range changed,
   * or the active sport has no cached ids yet. Cached ids per sport are kept when
   * switching tabs so load-more progress is preserved.
   */
  useEffect(() => {
    if (!loadedSidebarState.value) return;

    const timeFilterChanged = prevTimeFilterRef.current !== selectedTimeFilter;
    if (timeFilterChanged) {
      prevTimeFilterRef.current = selectedTimeFilter;
      setEventIdsBySport({});
      setHasMoreBySport({});
      setMarketsMetaBySport({});
    }

    const sport = selectedSport;
    const cachedLen = eventIdsBySportRef.current[sport]?.length ?? 0;
    if (!timeFilterChanged && cachedLen > 0) {
      setLoading(false);
      setLoadingMatches(false);
      return;
    }

    const gen = ++initialFetchGenRef.current;

    (async () => {
      try {
        setLoading(true);
        setLoadingMatches(true);
        const now = Date.now();
        const to = now + selectedTimeFilter * 60 * 60 * 1000;

        const res = await apiGetUpcomingMatches({
          from: now,
          to,
          limit: PAGE_SIZE,
          offset: 0,
          sport,
        });

        if (gen !== initialFetchGenRef.current) return;

        applyPageResult(sport, res, "replace");
      } catch (error) {
        console.error("Error fetching upcoming matches:", error);
      } finally {
        if (gen === initialFetchGenRef.current) {
          setLoading(false);
          setLoadingMatches(false);
        }
      }
    })();
  }, [selectedSport, selectedTimeFilter, loadedSidebarState.value]);

  useEffect(() => {
    if (!loadedSidebarState.value) return;
    setUpcomingSummaryCount(
      Object.keys(summarySports.value.counts).map((sport) => ({
        count: summarySports.value.counts[sport].total,
        name: sport,
        slug: sport,
      })),
    );
  }, [loadedSidebarState.value]);

  const loadMore = useCallback(() => {
    if (loadingMore) return;
    const sport = selectedSport;
    const loaded = eventIdsBySport[sport]?.length ?? 0;
    if (!hasMoreBySport[sport] || loaded === 0) return;

    const now = Date.now();
    const filterTo = now + selectedTimeFilter * 60 * 60 * 1000;
    setLoadingMore(true);

    const gen = ++loadMoreGenRef.current;

    apiGetUpcomingMatches({
      from: now,
      to: filterTo,
      sport,
      limit: PAGE_SIZE,
      offset: loaded,
    })
      .then((res) => {
        if (gen !== loadMoreGenRef.current) return;
        applyPageResult(sport, res, "append");
      })
      .catch((err) =>
        console.error("Error fetching more upcoming matches:", err),
      )
      .finally(() => {
        if (gen === loadMoreGenRef.current) {
          setLoadingMore(false);
        }
      });
  }, [
    loadingMore,
    selectedSport,
    selectedTimeFilter,
    eventIdsBySport,
    hasMoreBySport,
  ]);

  const handleTimeFilterClick = (option: number) => {
    setSelectedTimeFilter(option);
  };

  const idsForTab = eventIdsBySport[selectedSport] ?? [];
  const showLoadMore = hasMoreBySport[selectedSport] === true;

  const metaForTab = marketsMetaBySport[selectedSport];
  const marketSelectOptions = metaForTab?.length
    ? metaForTab
    : FALLBACK_MARKET_OPTIONS;

  useEffect(() => {
    const meta = marketsMetaBySport[selectedSport];
    if (!meta?.length) return;
    setSelectedMarket((prev) => (meta.includes(prev) ? prev : meta[0]!));
  }, [selectedSport, marketsMetaBySport]);

  return (
    <div
      className={`flex flex-col text-[var(--text-basic-color)] w-full ${isMobile ? "" : "p-2"} pb-5 min-h-0`}
    >
      <div className="flex flex-col w-full gap-[10px]">
        <div className="flex w-full items-center gap-2 p-3 rounded-[4px]">
          <Select
            value={selectedTimeFilter}
            onSelect={(key: any) => {
              handleTimeFilterClick(key);
            }}
            className="text-[var(--text-basic-color)]"
            notInvert
            classNames={{
              panel:
                "rounded-[8px] min-w-[200px] text-[var(--text-basic-color)] border border-[var(--primary-border-color)] overflow-y-auto gap-[2px] bg-[var(--background-element)] shadow-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1)]",
              item: "text-[12px] py-1 bg-transparent ",
              trigger: `bg-[var(--sub-element-secondary)] border border-[var(--border-color)] h-[28px] text-[12px] rounded-[8px] pr-1 gap-2 py-[2px]`,
            }}
          >
            <SelectItem
              value={0}
              disabled
              className="text-[11px] bg-transparent cursor-default hover:bg-[var(--sub-element-color)]"
            >
              Show matches in:
            </SelectItem>
            {Object.values(timeFilterOptions).map((option) => (
              <SelectItem
                key={`upcoming-${option.value}`}
                value={option.value}
                className="hover:bg-black/15"
              >
                {option.name}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="flex w-full pb-[10px]">
          <SportsList
            sportsData={upcomingSummaryCount}
            selectedSport={
              selectedSport || upcomingSummaryCount[0]?.slug || "soccer"
            }
            onSelectSport={setSelectedSport}
            loading={loadingMatches}
          />
        </div>
      </div>
      {loadingMatches ? (
        <UpcomingMatchesLoader matchesCount={4} />
      ) : (
        <div
          className={`flex flex-col w-full gap-1 ${isMobile.value ? "" : "overflow-y-auto"}`}
        >
          <div
            className="flex flex-col gap-[2px] w-full h-full scrollbar-none"
            style={{ height: "-webkit-fill-available" }}
          >
            <MarketNavigation
              options={marketSelectOptions}
              selectedValue={selectedMarket}
              onSelect={setSelectedMarket}
            />
            <div className="w-full rounded-lg overflow-hidden flex-1 min-h-0">
              {idsForTab.length === 0 && !loadingMatches ? (
                <div className="px-2 py-2 text-[var(--text-secondary-color)]">
                  {tCommon("noDataAvailable")}
                </div>
              ) : (
                idsForTab.map((item) => (
                  <div key={`upcoming-${item}`} className="flex w-full">
                    <Match eventId={item} marketSlug={selectedMarket} />
                  </div>
                ))
              )}
              {loadingMore && (
                <div className="flex flex-col gap-[2px] py-[2px]">
                  <UpcomingMatchSkeleton />
                  <UpcomingMatchSkeleton />
                  <UpcomingMatchSkeleton />
                </div>
              )}
              {showLoadMore && (
                <button
                  type="button"
                  className="text-[14px] mt-2 w-full text-[var(--text-secondary-color)] rounded-full cursor-pointer bg-[var(--sub-element-secondary)] px-2 py-2 disabled:opacity-50"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  Show More
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
