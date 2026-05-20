import { FunctionComponent } from "preact";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";

import { isMobile } from "@/state/isMobile";
import { useTranslate } from "@/shared/i18n/i18n";
import {
  apiGetUpcomingMatches,
  tGetUpcomingMatchesResponse,
} from "@/api/special-matches/apiGetUpcomingMatches";
import { apiGetMatches } from "@/api/matches/apiGetMatches";
import { storeEvent } from "@/helpers/storeEvent";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { summarySports } from "@/state/summarySports";
import { tSportResponse } from "@/api/sidebar/apiGetSummaryArray";
import { Select, SelectItem } from "../Select";
import { SportsList } from "../SportsList";
import { UpcomingMatchesLoader, UpcomingMatchSkeleton } from "../Loading";
import { MarketNavigation } from "../marketNavigation";
import { Match } from "../MatchesBoard/components/Match";
import { storeState } from "@/state/storeState";
import { useSidebarMarketNavigation } from "@/hooks/useSidebarMarketNavigation";
import {
  eventHasMarketType,
  isMoneylineSport,
} from "@/helpers/sidebarMarketNavigation";
import { MoneylineMatch } from "../MatchesBoard/components/Match/MoneylineMatch";

const PAGE_SIZE = 10;

/**
 * Walk the `tSportResponse` tuple tree returned by `apiGetUpcomingMatches`
 * and pull every event id, preserving the server-provided ordering
 * (sports → regions → leagues → eventIds).
 */
const flattenEventIds = (data: tSportResponse | undefined): number[] => {
  const ids: number[] = [];
  if (!Array.isArray(data)) return ids;
  for (const sport of data) {
    for (const region of sport?.[2] ?? []) {
      for (const league of region?.[2] ?? []) {
        for (const id of league?.[2] ?? []) {
          if (typeof id === "number") ids.push(id);
        }
      }
    }
  }
  return ids;
};

const dedupe = (ids: number[]): number[] => {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
};

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
  const [selectedSport, setSelectedSport] = useState<number>(1);
  const [loadedIds, setLoadedIds] = useState<number[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  /**
   * Each initial fetch bumps this generation token; in-flight responses for a
   * stale generation are discarded so rapid tab/time-filter changes don't race.
   */
  const fetchGenRef = useRef(0);

  /** Sports tabs come from the prematch sidebar summary. */
  const sportsWithCount = useMemo(() => {
    const data = summarySports.value.data ?? [];
    return data.map((sport) => {
      const count = (sport[2] ?? []).reduce(
        (regionAcc, region) =>
          regionAcc +
          (region[2] ?? []).reduce(
            (leagueAcc, league) => leagueAcc + (league[2] ?? []).length,
            0,
          ),
        0,
      );
      return { count, name: sport[1], id: sport[0] };
    });
  }, [summarySports.value]);

  /**
   * The API filters by sport name (e.g. "Soccer"), so resolve the currently
   * selected sport id against the sidebar summary.
   */
  const selectedSportName = useMemo(
    () =>
      summarySports.value.data?.find((s) => s[0] === selectedSport)?.[1] ?? "",
    [summarySports.value.data, selectedSport],
  );

  /**
   * Fetch upcoming events for the active sport + time window and store the
   * detailed payloads. Returns the appended ids and the server-reported total.
   */
  const fetchPage = useCallback(
    async (
      offset: number,
      sportName: string,
      timeFilter: number,
      gen: number,
    ): Promise<{ ids: number[]; total: number } | null> => {
      const from = Math.floor(Date.now() / 1000);
      const to = from + timeFilter * 3600;

      const res: tGetUpcomingMatchesResponse = await apiGetUpcomingMatches({
        from,
        to,
        sport: sportName,
        limit: PAGE_SIZE,
        offset,
      });

      if (gen !== fetchGenRef.current) return null;

      const ids = flattenEventIds(res.data);
      if (ids.length > 0) {
        const events = await apiGetMatches(ids);
        if (gen !== fetchGenRef.current) return null;
        (events ?? [])
          .slice()
          .sort(
            (a, b) =>
              new Date(a?.eventInfo?.startTime ?? 0).getTime() -
              new Date(b?.eventInfo?.startTime ?? 0).getTime(),
          )
          .forEach((event) => storeEvent(event));
      }

      return { ids, total: res.total ?? 0 };
    },
    [],
  );

  // Initial / refetch on sport or time filter change.
  useEffect(() => {
    if (!loadedSidebarState.value) return;

    if (!selectedSportName) {
      setLoadedIds([]);
      setTotal(0);
      setLoadingMatches(false);
      return;
    }

    const gen = ++fetchGenRef.current;
    setLoadingMatches(true);
    setLoadedIds([]);
    setTotal(0);

    (async () => {
      try {
        const result = await fetchPage(
          0,
          selectedSportName,
          selectedTimeFilter,
          gen,
        );
        if (!result || gen !== fetchGenRef.current) return;
        setLoadedIds(result.ids);
        setTotal(result.total);
      } catch (err) {
        console.error("Error fetching upcoming matches:", err);
      } finally {
        if (gen === fetchGenRef.current) {
          setLoadingMatches(false);
        }
      }
    })();
  }, [
    selectedSportName,
    selectedTimeFilter,
    loadedSidebarState.value,
    fetchPage,
  ]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loadingMatches) return;
    if (!selectedSportName) return;
    if (loadedIds.length >= total) return;

    const gen = fetchGenRef.current;
    setLoadingMore(true);
    try {
      const result = await fetchPage(
        loadedIds.length,
        selectedSportName,
        selectedTimeFilter,
        gen,
      );
      if (!result || gen !== fetchGenRef.current) return;
      setLoadedIds((prev) => dedupe([...prev, ...result.ids]));
      setTotal(result.total);
    } catch (err) {
      console.error("Error fetching more upcoming matches:", err);
    } finally {
      if (gen === fetchGenRef.current) {
        setLoadingMore(false);
      }
    }
  }, [
    loadingMore,
    loadingMatches,
    selectedSportName,
    selectedTimeFilter,
    loadedIds.length,
    total,
    fetchPage,
  ]);

  const showLoadMore = !loadingMatches && loadedIds.length < total;

  const loadedEventsForMarkets = useMemo(
    () =>
      loadedIds
        .map((id) => storeState.value[id]?.value)
        .filter(Boolean),
    [loadedIds, storeState.value],
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
  });

  return (
    <div
      className={`flex flex-col text-[var(--text-basic-color)] w-full ${isMobile ? "" : "p-2"} pb-5 min-h-0`}
    >
      <div className="flex flex-col w-full gap-[10px]">
        <div className="flex w-full items-center gap-2 p-3 rounded-[4px]">
          <Select
            value={selectedTimeFilter}
            onSelect={(key: any) => setSelectedTimeFilter(key)}
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
            sportsData={sportsWithCount}
            selectedSport={selectedSport}
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
            {showMarketNav ? (
              <MarketNavigation
                options={marketOptions}
                selectedValue={selectedMarketType}
                onSelect={setSelectedMarketType}
              />
            ) : null}
            <div className="w-full rounded-lg overflow-hidden flex-1 min-h-0">
              {loadedIds.length === 0 ? (
                <div className="px-2 py-2 text-[var(--text-secondary-color)]">
                  {tCommon("noDataAvailable")}
                </div>
              ) : (
                loadedIds.map((id) => (
                  <div key={`upcoming-${id}`} className="flex w-full">
                    {(() => {
                      const stored = storeState.value[id]?.value;
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
                        return <MoneylineMatch eventId={id} />;
                      }
                      return (
                        <Match
                          eventId={id}
                          marketType={matchMarketType}
                          allowAutoSelect={allowAutoSelect}
                        />
                      );
                    })()}
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
