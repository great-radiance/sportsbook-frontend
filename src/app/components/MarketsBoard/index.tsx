import { FunctionComponent } from "preact";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "preact/hooks";
import { MarketComponent } from "@/app/components/MarketsBoard/components/MarketComponent";
import { BASE_ASSET_PUBLIC_URL, getAppConfig } from "@/shared/config/appConfig";
import { MarketBoardLoader } from "@/app/components/Loading/MarketBoardLoader";
import { stateScoreBoardId, summarySports } from "@/state/summarySports";
import { isMobile } from "@/state/isMobile";
import { StateScoreBoard } from "../StateScoreBoard";
import { isBuilding } from "@/state/betState";
import { useTranslate } from "@/shared/i18n/i18n";
import { useRouteParams } from "@/hooks/useRotueParams";
import { apiGetMatchData } from "@/api/matches/apiGetMatchData";
import { apiGetMarketGroups } from "@/api/apiGetMarketGroups";
import { storeEvent } from "@/helpers/storeEvent";
import { storeState } from "@/state/storeState";
import {
  tEventModel,
  tMarketModel,
} from "@/types/typesForSocket.ts/tEventModel";
import slugify from "slugify";
import {
  formatScore,
  normalizeScoreboardFast,
} from "@/helpers/normalizeScoreboard";
import { useImperativeLiveClock } from "@/hooks/useLiveClock";
import { HorizontalTabs } from "../HorizontalTabs";
import { Switch } from "@/app/components/Switch";
import { getTranslate, getTranslatedText } from "@/helpers/getTranslate";
import { getTeamlogo, getTeamlogosByArray } from "@/helpers/getTeamlogos";
import { baseColorTheme } from "@/state/baseColorTheme";
import { convertAndStoreEvent } from "@/helpers/convertAndStoreEvent";
import { tEvent } from "@/types/tEvent";

interface markteGroupType {
  id: number;
  name: string;
  sport_id: number;
  sort: number;
}

export const MarketsBoard: FunctionComponent = () => {
  const baseTheme = baseColorTheme.value;
  const { t: tMarkets } = useTranslate("markets");
  const { t: tAlt } = useTranslate("alt");
  const { t: tCommon } = useTranslate("common");
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const { pageName, sportName, regionName, leagueName, eventId, sportName2 } =
    useRouteParams();
  const [marketGroups, setMarketGroups] = useState<any>(null);
  const [marketsByGroup, setMarketsByGroup] = useState<
    Record<number, tMarketModel[]>
  >({});
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
  const live = useMemo(() => eventData?.live, [eventData]);

  const markets =
    Object.values(eventData?.markets ?? {}).map((sig) => sig.value) || [];

  // useEffect(() => {
  //   if (eventData?.sport) {
  //     void getTeamlogosByArray(eventData?.sport, [homeTeam, awayTeam]);
  //   }
  // }, [eventData?.sport, homeTeam, awayTeam]);

  useEffect(() => {
    if (getAppConfig().lang !== "en") {
      (async () => {
        await Promise.all([
          getTranslate([
            ...(eventData?.participants?.map((p: any) => p.name) ?? []),
            eventData?.region ?? "",
            eventData?.league ?? "",
            ...(markets?.map((m: any) => m.name) ?? []),
          ]),
          getTeamlogosByArray(
            eventData?.sport || "",
            eventData?.participants?.map((p: any) => p.name) ?? [],
          ),
        ]);
      })();
    }
  }, [eventData]);

  useEffect(() => {
    if (getAppConfig().lang !== "en") {
      (async () => {
        await getTranslate(marketGroups?.map((g: any) => g.name) ?? []);
      })();
    }
  }, [marketGroups]);

  const normalizeScoreboard = normalizeScoreboardFast(
    eventData?.live?.scoreBoard,
  );

  const rawTime =
    eventData?.live?.status?.time ||
    eventData?.live?.clock?.clock_seconds ||
    normalizeScoreboard?.clock?.seconds ||
    null;

  const showClock =
    eventData?.status !== "Finished" &&
    eventData?.status !== "Coverage lost" &&
    !!eventData &&
    rawTime !== null &&
    eventData?.live?.clock?.clock_status !== "stopped";

  useImperativeLiveClock(clockRef, rawTime, showClock);

  const sortMarketsBySort = (
    markets: tMarketModel[] | undefined,
  ): tMarketModel[] => (markets ?? []).sort((a, b) => a.sort - b.sort);

  const sortMarketsByGroup = (
    grouped: Record<number, tMarketModel[]> | undefined,
  ): void => {
    if (!grouped) return;
    (Object.values(grouped) as tMarketModel[][]).forEach((arr) =>
      arr.sort((a, b) => a.sort - b.sort),
    );
  };

  // const normalizeTeamName = (name: string): string => {
  //   if (!name) return "";
  //   return name
  //     .toLowerCase()
  //     .replace(/[.,'"]/g, "") // Remove punctuation: periods, commas, apostrophes, quotes
  //     .replace(/\s+/g, " ") // Normalize whitespace
  //     .trim();
  // };

  const getEventData = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      if (!eventId) return;
      const res = await apiGetMatchData(parseInt(eventId));
      storeEvent({
        id: res.fixture.eventId,
        sport: res.fixture.sport.name,
        region: res.fixture.region.name,
        league: res.fixture.competition.name,
        participants: res.fixture.participants,

        sportRadarId: res.fixture.sportRadarId,
        outright: res.fixture.outright,
        markets: res.markets.map((m) => ({
          id: m.marketId,
          name: m.name,
          column: m.properties.column,
          groups: m.properties.groups,
          sort: m.properties.sort,
          status: m.status,
          odds: m.odds.map((o) => ({
            id: o.properties.uuid,
            name: o.name || o.properties,
            value: o.value,
            impliedOdd: o.impliedOdd,
            status: o.status,
            mv: o.mv,
            column: o.column,
            sort: o.sort,
          })),
        })),
        live: res.live,
      } as unknown as tEvent);
      if (pageName === "live") {
        stateScoreBoardId.value = res.fixture.sportRadarId.toString() || "";
      }
    } catch (error) {
      console.error("Error fetching market data:", error);
    } finally {
      inFlight.current = false;
    }
  }, [eventId, sportName, regionName, leagueName]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const res: any = await apiGetMarketGroups(
          slugify(
            sportName2 && pageName === "special" ? sportName2 : sportName || "",
            {
              lower: true,
              strict: true,
              trim: true,
            },
          ),
        );
        setMarketGroups(res as markteGroupType[]);
      } catch (error) {
        console.error("Error fetching market data:", error);
      }
    })();

    (async () => {
      setLoading(true);
      await getEventData();
      setLoading(false);
    })();
  }, [sportName, eventId]);

  useEffect(() => {
    const newMarketsByGroup = markets?.reduce(
      (acc: Record<number, tMarketModel[]>, market: tMarketModel) => {
        if (!market) return acc;
        const groupId = market?.groups?.[0] || 0;
        if (!acc[groupId]) {
          acc[groupId] = [];
        }
        acc[groupId].push(market);
        return acc;
      },
      {} as Record<number, tMarketModel[]>,
    );
    sortMarketsByGroup(newMarketsByGroup);
    setMarketsByGroup(newMarketsByGroup);
  }, [markets.length, marketGroups]);

  useEffect(() => {
    if (getAppConfig().lang === "en") return;
    const groups = marketGroups;
    if (!groups?.length) return;
    const sourceTexts = groups
      .map((g: any) => g.name)
      .filter((n: any): n is string => !!n);
    if (sourceTexts.length) getTranslate(sourceTexts);
  }, [marketGroups]);

  useEffect(() => {
    if (searchQuery) {
      const filteredMarkets = Object.values(eventData?.markets ?? {})
        .map((sig) => sig.value)
        .filter((market) =>
          market.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      setSearchResultMarkets(sortMarketsBySort(filteredMarkets));
    }
  }, [searchQuery]);

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
                src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportsicons/${eventData?.sport}.png`}
                onError={(e) => {
                  e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/icons/all-sports.png`;
                }}
                className={`w-[20px] h-[20px] ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
              />
              <span className="text-[12px] font-normal">
                {/* {eventData?.region ?? ""} - {eventData?.league || ""} */}
                {getTranslatedText(eventData?.region ?? "")} -{" "}
                {getTranslatedText(eventData?.league || "")}
              </span>
            </div>
          </div>
          <div
            className={`flex flex-col items-center w-full max-w-[752px] border border-[var(--border-color)] bg-[var(--sub-element-color)] p-2 rounded-lg gap-2`}
          >
            <div className="flex w-full flex-col justify-center items-center">
              {pageName === "live" && (
                <span className="bg-[var(--sub-element-secondary)] flex w-fit items-center py-[2px] px-[6px] rounded-full text-[11px] leading-[12px] font-bold">
                  {eventData?.status === "Finished" ? (
                    "Finished"
                  ) : eventData?.status === "Coverage lost" || !eventData ? (
                    "This event is no longer available"
                  ) : (
                    <span ref={clockRef}>00:00</span>
                  )}
                </span>
              )}
              <div className="flex w-full justify-center items-center gap-1">
                <span className="flex flex-1 h-full items-center justify-end text-center">
                  {getTranslatedText(
                    eventData?.participants?.[0]?.name || "",
                  )}{" "}
                </span>
                <img
                  src={
                    getTeamlogo(
                      eventData?.sport,
                      eventData?.participants?.[0]?.name || "",
                    ) ||
                    `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-home.png`
                  }
                  className="w-6 h-6"
                />
                {pageName === "live" ? (
                  <span className="w-[64px] gap-1 height-8 items-center justify-center text-[20px] flex font-bold">
                    {formatScore((live as any)?.scoreBoard).main}
                  </span>
                ) : (
                  <img
                    src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/light.png`}
                    className={`w-5 h-5 mx-3 ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                  />
                )}
                <img
                  src={
                    getTeamlogo(
                      eventData?.sport,
                      eventData?.participants?.[1]?.name || "",
                    ) ||
                    `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.png`
                  }
                  className="w-6 h-6"
                />
                <span className="flex h-full flex-1 items-center justify-start text-center">
                  {getTranslatedText(
                    eventData?.participants?.[1]?.name || "",
                  )}{" "}
                </span>
              </div>
            </div>
            {pageName === "live" && sportName === "Soccer" ? (
              <>
                <div className="flex w-full bg-white/20 justify-center h-[1px]" />
                <div className="flex w-[448px] gap-8 items-center justify-center">
                  <div className="flex items-center gap-2">
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/yellow-card.png`}
                    />
                    <span className="text-[14px]">
                      {(live?.scoreBoard as any)?.yellows?.h ?? 0} -{" "}
                      {(live?.scoreBoard as any)?.yellows?.g ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/corner.png`}
                    />
                    <span className="text-[14px]">
                      {(live?.scoreBoard as any)?.corners?.h ?? 0} -{" "}
                      {(live?.scoreBoard as any)?.corners?.g ?? 0}
                    </span>
                  </div>
                </div>
                <span className="text-[12px] text-center">
                  {formatScore((live as any)?.scoreBoard).sub}
                </span>
              </>
            ) : (
              <span className="text-[12px] text-center">
                {formatScore((live as any)?.scoreBoard).sub}
              </span>
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
            {/* Search Bar or Tablist Container */}
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
              <div className="flex items-center gap-0 w-full bg-[var(--sub-element-color)] overflow-hidden rounded-lg px-2 py-1 justify-between">
                <HorizontalTabs>
                  <button
                    onClick={() => {
                      setActiveTab(0);
                      // setSelectedGroupMarkets(sortMarketsBySort(eventData?.markets));
                    }}
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

                  {marketGroups?.map(
                    (tab: markteGroupType) =>
                      marketsByGroup?.[tab.id]?.length > 0 && (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            // setSelectedGroupMarkets(marketsByGroup?.[tab.id] || []);
                          }}
                          className={`flex items-baseline gap-0 px-3 h-9 shrink-0 transition-colors rounded-full ${
                            activeTab === tab.id
                              ? "bg-[var(--highlight-background)] text-[var(--text-basic-color)]"
                              : ""
                          }`}
                        >
                          <span className="text-[14px] leading-[36px]">
                            {getTranslatedText(tab.name || "")}
                          </span>
                          {marketsByGroup[tab.id]?.length > 0 && (
                            <sup className="text-[9px] text-[var(--text-sub-color)] ml-0.5 leading-none">
                              {marketsByGroup[tab.id]?.length}
                            </sup>
                          )}
                        </button>
                      ),
                  )}
                </HorizontalTabs>
                <div
                  className={`flex items-center gap-2 px-3 h-9 ml-1 shrink-0 transition-colors`}
                >
                  <span
                    className={`text-[14px] leading-[36px] ${
                      activeTab === -1 ? "text-[var(--text-basic-color)]" : ""
                    }`}
                  >
                    {tMarkets("betBuilderShort")}
                  </span>
                  <Switch
                    checked={isBuilding.value}
                    onChange={(checked: boolean) =>
                      (isBuilding.value = checked)
                    }
                    className="bg-[#C2CEE5]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col w-full gap-2 pt-1 pb-4">
            {eventData?.status === "Coverage lost" || !eventData ? (
              <div className="flex items-center justify-center w-full py-4 bg-[var(--sub-element-secondary)] rounded-[4px]">
                <span className="text-[14px] w-full text-center text-[var(--text-basic-color)]">
                  There is no available market for this event
                </span>
              </div>
            ) : (
              (searchQuery.length > 0
                ? searchResultMarkets
                : activeTab < 1
                  ? sortMarketsBySort(markets)
                  : (marketsByGroup?.[activeTab] ?? [])
              )?.map((market) => (
                <MarketComponent
                  key={market.id}
                  marketId={market.id}
                  eventId={eventId ? parseInt(eventId) : 0}
                  Collapsed={allCollapsed}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
