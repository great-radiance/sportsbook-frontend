import { FunctionComponent } from "preact";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import { useTranslate } from "@/shared/i18n/i18n";
import { storeEvent } from "@/helpers/storeEvent";
import { SportsList } from "../SportsList";
import { UpcomingMatchesLoader, UpcomingMatchSkeleton } from "../Loading";
import { HorizontalTabs } from "../HorizontalTabs";
import {
  UPCOMING_MATCH_COL_CELL,
  UPCOMING_MATCH_COL_GROUP,
  UPCOMING_MATCH_COL_MARKETS,
  UPCOMING_MATCH_COL_MATCH,
  UPCOMING_MATCH_HEADER,
  UpcomingMatchRow,
} from "./UpcomingMatchRow";
import { Match } from "../MatchesBoard/components/Match";
import { apiGetUpcoming } from "@/api/matches/apiGetUpcoming";
import { isMoneylineSport } from "@/helpers/sidebarMarketNavigation";
import { MoneylineMatch } from "../MatchesBoard/components/Match/MoneylineMatch";
import { getAppConfig } from "@/shared/config/appConfig";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";

const PAGE_SIZE = 10;
const DATE_TAB_COUNT = 4;

const DEFAULT_SPORTS: { name: string; id: number }[] = [
  { name: "Soccer", id: 1 },
  { name: "BasketBall", id: 8 },
];

type DateTab = {
  key: string;
  label: string;
  from: number;
  to: number;
};

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
  const { isMobile, loadedSidebarState, storeState } = useSportsbookStore();
  const { t: tLive } = useTranslate("liveCalendar");
  const { t: tCommon } = useTranslate("common");

  const dateTabs = useMemo(() => buildDateTabs(DATE_TAB_COUNT), []);
  const [selectedDateKey, setSelectedDateKey] = useState(
    () => dateTabs[0]?.key ?? "",
  );
  const [selectedSport, setSelectedSport] = useState<number>(1);
  const [loadedIds, setLoadedIds] = useState<number[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const matchesGenRef = useRef(0);

  const activeDateTab = useMemo(
    () => dateTabs.find((t) => t.key === selectedDateKey) ?? dateTabs[0],
    [dateTabs, selectedDateKey],
  );

  const loadMatches = useCallback(
    async ({
      append = false,
      offset = 0,
    }: { append?: boolean; offset?: number } = {}) => {
      const gen = ++matchesGenRef.current;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoadingMatches(true);
        setLoadedIds([]);
        setTotalCount(0);
      }

      try {
        const pageFrom = offset;
        const pageTo = offset + PAGE_SIZE;
        const res = await apiGetUpcoming(
          activeDateTab.from,
          activeDateTab.to,
          pageFrom,
          pageTo,
          selectedSport,
        );
        if (gen !== matchesGenRef.current) return;

        for (const event of res.data) {
          storeEvent(event);
        }
        storeState.value = { ...storeState.value };
        const eventIds = res.data.map((event) => event.eventInfo.id);
        setLoadedIds((prev) => (append ? [...prev, ...eventIds] : eventIds));
        setTotalCount(res.total);
      } catch (error) {
        console.error("Error fetching upcoming matches:", error);
        if (!append && gen === matchesGenRef.current) {
          setLoadedIds([]);
          setTotalCount(0);
        }
      } finally {
        if (gen === matchesGenRef.current) {
          setLoadingMatches(false);
          setLoadingMore(false);
        }
      }
    },
    [activeDateTab.from, activeDateTab.to, selectedSport],
  );

  useEffect(() => {
    void loadMatches({ append: false, offset: 0 });
  }, [loadMatches]);

  const showMoneylineLayout = isMoneylineSport(selectedSport);
  const hasMore = loadedIds.length < totalCount;

  return (
    <div
      className={`flex flex-col text-[var(--text-basic-color)] w-full ${isMobile.value ? "" : "p-2"} pb-5 min-h-0`}
    >
      <div className="flex w-full pb-2">
        <SportsList
          sportsData={DEFAULT_SPORTS}
          selectedSport={selectedSport}
          onSelectSport={setSelectedSport}
          loading={!loadedSidebarState.value}
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

      {loadingMatches ? (
        <UpcomingMatchesLoader matchesCount={4} />
      ) : loadedIds.length === 0 ? (
        <div className="px-2 py-4 text-[12px] text-[var(--text-sub-color)]">
          {tCommon("noDataAvailable")}
        </div>
      ) : showMoneylineLayout ? (
        <div className="flex flex-col w-full gap-2">
          <div className="flex flex-col w-full gap-2">
            {loadedIds.map((eventId) => (
              <MoneylineMatch key={eventId} eventId={eventId} />
            ))}
          </div>
          {loadingMore ? (
            <div className="flex flex-col gap-[2px] py-2 px-2">
              <UpcomingMatchSkeleton />
              <UpcomingMatchSkeleton />
            </div>
          ) : null}
          {hasMore ? (
            <button
              type="button"
              className="text-[14px] m-2 text-[var(--text-secondary-color)] rounded-full cursor-pointer bg-[var(--sub-element-secondary)] px-2 py-2 disabled:opacity-50"
              onClick={() =>
                loadMatches({ append: true, offset: loadedIds.length })
              }
              disabled={loadingMore}
            >
              Show More
            </button>
          ) : null}
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
              thirdColLabel={tLive("thirdColLabel")}
            />
          )}

          {loadedIds.map((eventId) =>
            isMobile.value ? (
              <Match
                key={eventId}
                eventId={eventId}
                marketType={1}
                allowAutoSelect={true}
              />
            ) : (
              <UpcomingMatchRow key={eventId} eventId={eventId} />
            ),
          )}

          {loadingMore ? (
            <div className="flex flex-col gap-[2px] py-2 px-2">
              <UpcomingMatchSkeleton />
              <UpcomingMatchSkeleton />
            </div>
          ) : null}

          {hasMore ? (
            <button
              type="button"
              className="text-[14px] m-2 text-[var(--text-secondary-color)] rounded-full cursor-pointer bg-[var(--sub-element-secondary)] px-2 py-2 disabled:opacity-50"
              onClick={() =>
                loadMatches({ append: true, offset: loadedIds.length })
              }
              disabled={loadingMore}
            >
              Show More
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};
