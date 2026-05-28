import { FunctionComponent } from "preact";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "preact/hooks";
import { MarketComponent } from "@/app/components/MarketsBoard/components/MarketComponent";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { MarketBoardLoader } from "@/app/components/Loading/MarketBoardLoader";
import { stateScoreBoardId } from "@/state/summarySports";
import { isMobile } from "@/state/isMobile";
import { StateScoreBoard } from "../StateScoreBoard";
import { isBuilding } from "@/state/betState";
import { setBetBuilderMode } from "@/helpers/setBetBuilderMode";
import { useTranslate } from "@/shared/i18n/i18n";
import { useRouteParams } from "@/hooks/useRotueParams";
import { apiGetMatchData } from "@/api/matches/apiGetMatchData";
import { storeEvent } from "@/helpers/storeEvent";
import { storeState } from "@/state/storeState";
import {
  tEventModel,
  tMarketModel,
} from "@/types/typesForSocket.ts/tEventModel";
import { useImperativeLiveClock } from "@/hooks/useLiveClock";
import { HorizontalTabs } from "../HorizontalTabs";
import { Switch } from "@/app/components/Switch";
import { baseColorTheme } from "@/state/baseColorTheme";
import { groupMarketsByNameAndType } from "@/helpers/groupMarketsByNameAndType";
import {
  collectMarketGroupTabs,
  filterMarketsByGroupTab,
  sortMarketsByMarketsRefOrder,
} from "@/helpers/eventMarketGroups";

/**
 * Read a competitor's score from the scoreboard shape.
 * Position 1 = home (competitor index 0), 2 = away (competitor index 1).
 * Prefers `results[]` (explicit per-competitor) and falls back to the
 * `homeGameScore` / `awayGameScore` shortcut fields.
 */
const getCompetitorScore = (scoreboard: any, position: 1 | 2): number => {
  if (!scoreboard) return 0;
  const fromResults = scoreboard.results?.find(
    (r: any) => r.competitorPosition === position,
  )?.value;
  const parsedResult = Number(fromResults);
  if (Number.isFinite(parsedResult)) return parsedResult;
  const fallback =
    position === 1 ? scoreboard.homeGameScore : scoreboard.awayGameScore;
  const parsedFallback = Number(fallback);
  return Number.isFinite(parsedFallback) ? parsedFallback : 0;
};

export const MarketsBoard: FunctionComponent = () => {
  const baseTheme = baseColorTheme.value;
  const { t: tMarkets } = useTranslate("markets");
  const { t: tAlt } = useTranslate("alt");
  const [allCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const { pageName, sportName, eventId } = useRouteParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState<boolean>(true);
  const [searchResultMarkets, setSearchResultMarkets] = useState<
    tMarketModel[]
  >([]);
  const inFlight = useRef(false);
  const clockRef = useRef<HTMLSpanElement>(null);

  const eventData = eventId
    ? storeState.value[parseInt(eventId)]?.value
    : ({} as tEventModel);

  const markets =
    Object.values(eventData?.markets ?? {}).map((sig) => sig.value) || [];

  const betBuilderMarkets = useMemo(
    () => markets.filter((m) => m.isBetBuilderSupported),
    [markets],
  );

  const poolMarkets = isBuilding.value ? betBuilderMarkets : markets;

  const groupTabs = useMemo(
    () => collectMarketGroupTabs(eventData?.marketsRef, poolMarkets),
    [eventData?.marketsRef, poolMarkets],
  );

  const marketsForActiveTab = useMemo(() => {
    if (activeTab > 0 && groupTabs[activeTab - 1]) {
      return filterMarketsByGroupTab(
        poolMarkets,
        eventData?.marketsRef,
        groupTabs[activeTab - 1].id,
      );
    }
    return sortMarketsByMarketsRefOrder(poolMarkets, eventData?.marketsRef);
  }, [poolMarkets, activeTab, groupTabs, eventData?.marketsRef]);

  const mergedMarkets = useMemo(
    () => groupMarketsByNameAndType(marketsForActiveTab),
    [marketsForActiveTab],
  );

  const mergedSearchResults = useMemo(() => {
    const list = isBuilding.value
      ? searchResultMarkets.filter((m) => m.isBetBuilderSupported)
      : searchResultMarkets;
    return groupMarketsByNameAndType(list);
  }, [searchResultMarkets, isBuilding.value]);

  const displayGroups =
    searchQuery.length > 0 ? mergedSearchResults : mergedMarkets;

  const emptyMarketsMessage =
    isBuilding.value && betBuilderMarkets.length === 0
      ? tMarkets("noBetBuilderMarketsAvailable")
      : tMarkets("noMarketsAvailable");

  const scoreboard = eventData?.scoreboard;
  const homeGoals = getCompetitorScore(scoreboard, 1);
  const awayGoals = getCompetitorScore(scoreboard, 2);

  const statusDescription = eventData?.statusDescription ?? "";
  const isFinished = statusDescription === "Finished";
  const isCoverageLost = statusDescription === "Coverage lost";
  const isLive = eventData?.status === 3;

  const rawTime = typeof scoreboard?.time === "number" ? scoreboard.time : null;
  const showClock = isLive && rawTime !== null && rawTime > 0;

  useImperativeLiveClock(clockRef, rawTime, showClock);

  const getEventData = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      if (!eventId) return;
      const res = await apiGetMatchData(parseInt(eventId));
      storeEvent(res);
      if (pageName === "live") {
        // mappingInfo carries feed-side identifiers; pick the first one for
        // the scoreboard widget (e.g. sportradar) if present.
        stateScoreBoardId.value = res.eventInfo.mappingInfo?.[0]?.id ?? "";
      }
    } catch (error) {
      console.error("Error fetching market data:", error);
    } finally {
      inFlight.current = false;
    }
  }, [eventId, pageName]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await getEventData();
      setLoading(false);
    })();
  }, [sportName, eventId]);

  useEffect(() => {
    setActiveTab(0);
  }, [eventId]);

  useEffect(() => {
    if (activeTab > 0 && activeTab > groupTabs.length) {
      setActiveTab(0);
    }
  }, [activeTab, groupTabs.length, isBuilding.value]);

  useEffect(() => {
    if (isBuilding.value && activeTab !== 0) {
      setActiveTab(0);
    }
  }, [isBuilding.value]);

  useEffect(() => {
    if (!searchQuery) {
      setSearchResultMarkets([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filteredMarkets = Object.values(eventData?.markets ?? {})
      .map((sig) => sig.value)
      .filter((market) => market.name.toLowerCase().includes(q));
    setSearchResultMarkets(filteredMarkets);
  }, [searchQuery, eventData?.markets]);

  const homeName = eventData?.competitors?.[0]?.name ?? "";
  const awayName = eventData?.competitors?.[1]?.name ?? "";
  const sportName_ = eventData?.sport?.name ?? "";
  const regionName_ = eventData?.region?.name ?? "";
  const leagueName_ = eventData?.league?.name ?? "";

  return (
    <div
      className={`flex flex-col flex-1 min-w-0 text-[var(--text-basic-color)] ${
        isMobile.value ? "w-full" : "w-full"
      } min-h-0 h-full my-2 md:px-2 gap-2 overflow-y-auto overflow-x-hidden`}
    >
      {!loading && (
        <div className="relative w-full flex flex-col items-center rounded-[8px] pb-2 px-1 overflow-hidden flex-shrink-0 border border-none">
          <div
            className={`flex w-full h-[48px] items-center ${pageName === "live" ? "justify-between" : "bg-[var(--sub-element-color)] max-w-[752px]  justify-center mt-2 rounded-lg"} px-3`}
          >
            <div className="flex items-center gap-2">
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${eventData?.sport.id}.svg`}
                onError={(e) => {
                  e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
                }}
                className={`w-[20px] h-[20px] ${baseTheme === "dark" ? "invert" : ""}`}
              />
              <span className="text-[12px] font-normal">
                {regionName_} - {leagueName_}
              </span>
            </div>
          </div>
          <div
            className={`flex flex-col items-center w-full max-w-[752px] border border-[var(--border-color)] bg-[var(--sub-element-color)] p-2 rounded-lg gap-2`}
          >
            <div className="flex w-full flex-col justify-center items-center">
              {pageName === "live" && (
                <span className="bg-[var(--sub-element-secondary)] flex w-fit items-center py-[2px] px-[6px] rounded-full text-[11px] leading-[12px] font-bold">
                  {isFinished ? (
                    "Finished"
                  ) : isCoverageLost || !eventData ? (
                    "This event is no longer available"
                  ) : (
                    <span ref={clockRef}>00:00</span>
                  )}
                </span>
              )}
              <div className="flex w-full justify-center items-center gap-1">
                <span className="flex flex-1 h-full items-center justify-end text-center">
                  {homeName}
                </span>
                {pageName === "live" ? (
                  <span className="w-[64px] gap-1 height-8 items-center justify-center text-[20px] flex font-bold">
                    {homeGoals} - {awayGoals}
                  </span>
                ) : (
                  <img
                    src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/light.png`}
                    className={`w-5 h-5 mx-3 ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                  />
                )}
                <span className="flex h-full flex-1 items-center justify-start text-center">
                  {awayName}
                </span>
              </div>
            </div>
            {pageName === "live" && sportName === "Soccer" && (
              <>
                <div className="flex w-full bg-white/20 justify-center h-[1px]" />
                <div className="flex w-[448px] gap-8 items-center justify-center">
                  <div className="flex items-center gap-2">
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/yellow-card.png`}
                    />
                    <span className="text-[14px]">
                      {(scoreboard as any)?.yellows?.h ?? 0} -{" "}
                      {(scoreboard as any)?.yellows?.g ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/corner.png`}
                    />
                    <span className="text-[14px]">
                      {(scoreboard as any)?.corners?.h ?? 0} -{" "}
                      {(scoreboard as any)?.corners?.g ?? 0}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {loading ? (
        <MarketBoardLoader
          marketsCount={4}
          oddsPerMarket={3}
          pageName={pageName}
        />
      ) : (
        <>
          {isMobile.value && pageName === "live" && <StateScoreBoard />}
          <div
            className={`flex flex-col gap-[2px] min-w-0 bg-[var(--sub-element-color)] rounded-[8px]`}
          >
            {showSearch ? (
              <div className="flex items-center w-full h-9 pr-[10px] rounded-[4px] bg-[var(--sub-element-secondary)] gap-2">
                <button
                  onClick={() => setShowSearch(false)}
                  className={`flex items-center justify-center w-9 h-9 rounded-[4px]  transition-colors shrink-0 ${
                    !isMobile.value ? "hover:bg-white/30" : ""
                  }`}
                >
                  <img
                    src={`${BASE_ASSET_PUBLIC_URL}/icons/close.png`}
                    className="w-[10px]"
                    alt={tAlt("close")}
                  />
                </button>
                <input
                  type="text"
                  placeholder={tMarkets("searchPlaceholder")}
                  className="flex-1 px-2 bg-transparent outline-none text-[14px] leading-[36px] text-[var(--text-basic-color)] placeholder-white/60"
                  autoFocus
                  onChange={(e: any) => setSearchQuery(e.target.value)}
                  value={searchQuery}
                />
              </div>
            ) : (
              <div className="flex items-center w-full min-w-0 gap-2 bg-[var(--sub-element-color)] rounded-lg px-2 py-1">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <HorizontalTabs>
                    <button
                      type="button"
                      onClick={() => setActiveTab(0)}
                      className={`flex items-baseline gap-0 px-3 h-9 shrink-0 transition-colors rounded-full ${
                        activeTab === 0
                          ? "bg-[var(--highlight-background)] text-[var(--text-basic-color)]"
                          : ""
                      }`}
                    >
                      <span className="text-[14px] leading-[36px]">
                        {tMarkets("all")}
                      </span>
                    </button>
                    {groupTabs.map((group, index) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setActiveTab(index + 1)}
                        className={`flex items-baseline gap-0 px-3 h-9 shrink-0 transition-colors rounded-full ${
                          activeTab === index + 1
                            ? "bg-[var(--highlight-background)] text-[var(--text-basic-color)]"
                            : ""
                        }`}
                      >
                        <span className="text-[14px] leading-[36px] truncate max-w-[140px]">
                          {group.name}
                        </span>
                      </button>
                    ))}
                  </HorizontalTabs>
                </div>
                <div className="flex items-center gap-2 h-9 shrink-0 pl-2 border-l border-[var(--primary-border-color)]">
                  <span className="text-[14px] leading-[36px] whitespace-nowrap">
                    {tMarkets("betBuilderShort")}
                  </span>
                  <Switch
                    checked={isBuilding.value}
                    onChange={setBetBuilderMode}
                    className="bg-[#C2CEE5]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col w-full gap-2 pt-1 pb-4">
            {isCoverageLost || !eventData ? (
              <div className="flex items-center justify-center w-full py-4 bg-[var(--sub-element-secondary)] rounded-[4px]">
                <span className="text-[14px] w-full text-center text-[var(--text-basic-color)]">
                  {tMarkets("noMarketsAvailable")}
                </span>
              </div>
            ) : displayGroups.length === 0 ? (
              <div className="flex items-center justify-center w-full py-8 px-4 bg-[var(--sub-element-secondary)] rounded-[4px]">
                <span className="text-[14px] w-full text-center text-[var(--text-sub-color)]">
                  {emptyMarketsMessage}
                </span>
              </div>
            ) : (
              displayGroups.map((group) => (
                <MarketComponent
                  key={group.key}
                  marketId={group.ids.length === 1 ? group.ids[0] : group.ids}
                  eventId={eventId ? parseInt(eventId) : 0}
                  Collapsed={allCollapsed}
                  type={group.type}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
