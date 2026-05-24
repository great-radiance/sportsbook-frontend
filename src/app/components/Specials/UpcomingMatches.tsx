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
import { apiGetUpcomingMatches } from "@/api/special-matches/apiGetUpcomingMatches";
import { apiGetMatches } from "@/api/matches/apiGetMatches";
import { storeEvent } from "@/helpers/storeEvent";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { summarySports } from "@/state/summarySports";
import { tSportResponse } from "@/api/sidebar/apiGetSummaryArray";
import { SportsList } from "../SportsList";
import { UpcomingMatchesLoader, UpcomingMatchSkeleton } from "../Loading";
import { HorizontalTabs } from "../HorizontalTabs";
import { storeState } from "@/state/storeState";
import { sortEventIdsByStartDate } from "@/helpers/sortEventIdsByStartDate";
import { eventHasStoredMarkets } from "@/helpers/upcomingMatchMarkets";
import {
  UPCOMING_MATCH_COL_CELL,
  UPCOMING_MATCH_COL_GROUP,
  UPCOMING_MATCH_COL_MARKETS,
  UPCOMING_MATCH_COL_MATCH,
  UPCOMING_MATCH_HEADER,
  UpcomingMatchRow,
} from "./UpcomingMatchRow";
import { Match } from "../MatchesBoard/components/Match";

const PAGE_SIZE = 10;
const DATE_TAB_COUNT = 4;

type DateTab = {
  key: string;
  label: string;
  from: number;
  to: number;
};

function flattenEventIds(data: tSportResponse | undefined): number[] {
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
}

function dedupe(ids: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function buildDateTabs(count: number): DateTab[] {
  const tabs: DateTab[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const day = new Date(base);
    day.setDate(base.getDate() + i);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);

    const weekday = day.toLocaleDateString(undefined, { weekday: "long" });
    const dd = String(day.getDate()).padStart(2, "0");
    const mm = String(day.getMonth() + 1).padStart(2, "0");

    tabs.push({
      key: day.toISOString().slice(0, 10),
      label: `${weekday}, ${dd}/${mm}`,
      from: Math.floor(day.getTime() / 1000),
      to: Math.floor(end.getTime() / 1000),
    });
  }
  return tabs;
}

function buildEventIdsBySport(
  data: tSportResponse | undefined,
): Map<number, number[]> {
  const map = new Map<number, number[]>();
  if (!Array.isArray(data)) return map;
  for (const sport of data) {
    const ids = dedupe(flattenEventIds([sport]));
    if (ids.length > 0) map.set(sport[0], ids);
  }
  return map;
}

async function hydrateEvents(ids: number[], gen: number, fetchGen: number) {
  if (ids.length === 0) return;
  const events = await apiGetMatches(ids);
  if (gen !== fetchGen) return;
  (events ?? []).forEach((event) => storeEvent(event));
}

function UpcomingMatchesHeader({
  thirdColLabel,
  matchesLabel,
  totalLabel,
}: {
  thirdColLabel: string;
  matchesLabel: string;
  totalLabel: string;
}) {
  return (
    <div className={UPCOMING_MATCH_HEADER}>
      <span className={UPCOMING_MATCH_COL_MATCH}>{matchesLabel}</span>
      <div className={UPCOMING_MATCH_COL_MARKETS}>
        <div className={UPCOMING_MATCH_COL_GROUP}>
          {(["1", "X", "2"] as const).map((label) => (
            <span
              key={label}
              className={`${UPCOMING_MATCH_COL_CELL} text-center`}
            >
              {label}
            </span>
          ))}
        </div>
        <span className={`${UPCOMING_MATCH_COL_GROUP} justify-center`}>
          {totalLabel}
        </span>
        <span className={`${UPCOMING_MATCH_COL_GROUP} justify-center`}>
          {thirdColLabel}
        </span>
      </div>
    </div>
  );
}

export const UpcomingMatches: FunctionComponent = () => {
  const { t: tLive } = useTranslate("liveCalendar");
  const { t: tCommon } = useTranslate("common");

  const dateTabs = useMemo(() => buildDateTabs(DATE_TAB_COUNT), []);
  const [selectedDateKey, setSelectedDateKey] = useState(
    () => dateTabs[0]?.key ?? "",
  );
  const [selectedSport, setSelectedSport] = useState<number>(1);
  const [eventIdsBySport, setEventIdsBySport] = useState<Map<number, number[]>>(
    () => new Map(),
  );
  const [loadedIds, setLoadedIds] = useState<number[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const catalogGenRef = useRef(0);
  const matchesGenRef = useRef(0);

  const activeDateTab = useMemo(
    () => dateTabs.find((t) => t.key === selectedDateKey) ?? dateTabs[0],
    [dateTabs, selectedDateKey],
  );

  const sportsWithCount = useMemo(() => {
    const names = new Map(
      (summarySports.value.data ?? []).map((s) => [s[0], s[1]] as const),
    );
    return [...eventIdsBySport.entries()]
      .map(([id, ids]) => ({
        id,
        name: names.get(id) ?? `Sport ${id}`,
        count: ids.length,
      }))
      .filter((s) => s.count > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [eventIdsBySport, summarySports.value.data]);

  const sportEventIds = useMemo(
    () => eventIdsBySport.get(selectedSport) ?? [],
    [eventIdsBySport, selectedSport],
  );

  const displayedEventIds = useMemo(
    () => sortEventIdsByStartDate(loadedIds),
    // .filter((id) =>
    //     eventHasStoredMarkets(storeState.value[id]?.value),
    //   ),
    [loadedIds, storeState.value],
  );

  useEffect(() => {
    if (!loadedSidebarState.value || !activeDateTab) return;

    const gen = ++catalogGenRef.current;
    setLoadingCatalog(true);
    setEventIdsBySport(new Map());
    setLoadedIds([]);

    (async () => {
      try {
        const res = await apiGetUpcomingMatches({
          from: activeDateTab.from,
          to: activeDateTab.to,
          tradingStatus: 0,
          status: [1, 2],
        });
        if (gen !== catalogGenRef.current) return;
        setEventIdsBySport(buildEventIdsBySport(res.data));
      } catch (err) {
        console.error("Error fetching upcoming catalog:", err);
        if (gen === catalogGenRef.current) setEventIdsBySport(new Map());
      } finally {
        if (gen === catalogGenRef.current) setLoadingCatalog(false);
      }
    })();
  }, [activeDateTab, loadedSidebarState.value]);

  useEffect(() => {
    if (loadingCatalog) return;

    const gen = ++matchesGenRef.current;
    setLoadingMatches(true);
    setLoadedIds([]);

    const ids = sportEventIds;
    if (ids.length === 0) {
      setLoadingMatches(false);
      return;
    }

    (async () => {
      try {
        const batch = ids.slice(0, PAGE_SIZE);
        await hydrateEvents(batch, gen, matchesGenRef.current);
        if (gen !== matchesGenRef.current) return;
        setLoadedIds(batch);
      } catch (err) {
        console.error("Error fetching upcoming match details:", err);
      } finally {
        if (gen === matchesGenRef.current) setLoadingMatches(false);
      }
    })();
  }, [selectedSport, sportEventIds, loadingCatalog]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loadingMatches || loadingCatalog) return;
    if (loadedIds.length >= sportEventIds.length) return;

    const gen = matchesGenRef.current;
    setLoadingMore(true);
    try {
      const nextIds = sportEventIds.slice(
        loadedIds.length,
        loadedIds.length + PAGE_SIZE,
      );
      await hydrateEvents(nextIds, gen, matchesGenRef.current);
      if (gen !== matchesGenRef.current) return;
      setLoadedIds((prev) => dedupe([...prev, ...nextIds]));
    } catch (err) {
      console.error("Error fetching more upcoming matches:", err);
    } finally {
      if (gen === matchesGenRef.current) setLoadingMore(false);
    }
  }, [
    loadingMore,
    loadingMatches,
    loadingCatalog,
    sportEventIds,
    loadedIds.length,
  ]);

  useEffect(() => {
    if (sportsWithCount.length === 0) return;
    if (!sportsWithCount.some((s) => s.id === selectedSport)) {
      setSelectedSport(sportsWithCount[0].id);
    }
  }, [sportsWithCount, selectedSport]);

  const thirdColLabel = "GG/NG";

  const listLoading = loadingCatalog || loadingMatches;
  const showLoadMore = !listLoading && loadedIds.length < sportEventIds.length;

  if (!loadedSidebarState.value) return null;

  return (
    <div
      className={`flex flex-col text-[var(--text-basic-color)] w-full ${isMobile ? "" : "p-2"} pb-5 min-h-0`}
    >
      <div className="flex w-full pb-2">
        <SportsList
          sportsData={sportsWithCount}
          selectedSport={selectedSport}
          onSelectSport={setSelectedSport}
          loading={loadingCatalog}
        />
      </div>

      <div className="flex w-full border-b border-[var(--border-color)] mb-2">
        <HorizontalTabs className="w-full" scrollerClassName="gap-0">
          {dateTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`shrink-0 px-4 py-2.5 text-[12px] whitespace-nowrap border-b-2 transition-colors ${
                selectedDateKey === tab.key
                  ? "border-[var(--text-basic-color)] text-[var(--text-basic-color)] font-medium"
                  : "border-transparent text-[var(--text-sub-color)] hover:text-[var(--text-basic-color)]"
              }`}
              onClick={() => setSelectedDateKey(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </HorizontalTabs>
      </div>

      {listLoading ? (
        <UpcomingMatchesLoader matchesCount={4} />
      ) : sportsWithCount.length === 0 ? (
        <div className="px-2 py-4 text-[12px] text-[var(--text-sub-color)]">
          {tCommon("noDataAvailable")}
        </div>
      ) : (
        <div
          className={`flex flex-col w-full rounded-[8px] border-[0px] md:border-[1px] md:border-[var(--border-color)] gap-2 md:gap-0 bg-[var(--background-element)] overflow-hidden ${
            isMobile.value ? "" : "overflow-y-auto"
          }`}
        >
          {isMobile.value ? null : (
            <UpcomingMatchesHeader
              matchesLabel={tLive("Matches")}
              totalLabel={tLive("totalLabel")}
              thirdColLabel={thirdColLabel}
            />
          )}

          {displayedEventIds.length === 0 ? (
            <div className="px-2 py-4 text-[12px] text-[var(--text-sub-color)]">
              {tCommon("noDataAvailable")}
            </div>
          ) : (
            displayedEventIds.map((eventId) =>
              isMobile.value ? (
                <Match
                  eventId={eventId}
                  marketType={1}
                  allowAutoSelect={true}
                />
              ) : (
                <UpcomingMatchRow key={eventId} eventId={eventId} />
              ),
            )
          )}

          {loadingMore && (
            <div className="flex flex-col gap-[2px] py-2 px-2">
              <UpcomingMatchSkeleton />
              <UpcomingMatchSkeleton />
            </div>
          )}

          {showLoadMore && (
            <button
              type="button"
              className="text-[14px] m-2 text-[var(--text-secondary-color)] rounded-full cursor-pointer bg-[var(--sub-element-secondary)] px-2 py-2 disabled:opacity-50"
              onClick={loadMore}
              disabled={loadingMore}
            >
              Show More
            </button>
          )}
        </div>
      )}
    </div>
  );
};
