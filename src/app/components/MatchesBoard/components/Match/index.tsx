import { FunctionComponent } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { useLocation } from "wouter-preact";
import { Market } from "./Market";
import { linkButtonOnClick } from "@/helpers/linkButtonClick";
import {
  currentCompactState,
  panelCompactState,
} from "@/state/panelCompactState";
import { storeState } from "@/state/storeState";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { popularMatchesState } from "@/state/popularMatchesState";
import { getTranslatedText } from "@/helpers/getTranslate";
import { getTeamlogo } from "@/helpers/getTeamlogos";
import { baseColorTheme } from "@/state/baseColorTheme";
import { useImperativeLiveClock } from "@/hooks/useLiveClock";
import { normalizeScoreboardFast } from "@/helpers/normalizeScoreboard";
import { MoneylineMatch } from "./MoneylineMatch";
import { getRegionNameById } from "@/shared/utils/Resion";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { MarketComponent } from "@/app/components/MarketsBoard/components/MarketComponent";

interface MatchProps {
  eventId: number;
  marketSlug?: string;
  marketId?: number;
  showLeagueLogo?: boolean;
  allowAutoSelect?: boolean; // If true, will auto-select the first market if no marketSlug match is found
  allowRounded?: boolean;
}

export const formatStartTime = (timestamp: number): string => {
  try {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return "00:00";
  }
};

export const formatStartDate = (timestamp: number): string => {
  try {
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${day}/${month}`;
  } catch {
    return "00/00";
  }
};

export const Match: FunctionComponent<MatchProps> = ({
  eventId,
  marketSlug,
  marketId,
  // isLive = false,
  allowAutoSelect = false,
  showLeagueLogo = false,
  allowRounded = false,
}) => {
  const event = storeState.value[eventId]?.value;
  console.log("storeState", storeState.value);
  console.log(
    "eventId",
    eventId,
    "marketSlug",
    marketSlug,
    "marketId",
    marketId,
    "event",
  );
  if (!event) return null;

  const showLeague =
    showLeagueLogo || event?.sport.id === 1 || event?.sport.id === 8;

  const isLive = event?.status === 3;

  const [, setLocation] = useLocation();
  const live = event?.live;
  const baseTheme = baseColorTheme.value;
  const clockRef = useRef<HTMLSpanElement>(null);

  const participants = event?.competitors || [];
  const homeTeam = participants[0]?.name || "Team 1";
  const awayTeam = participants[1]?.name || "Team 2";

  const markets = event?.markets
    ? Object.values(event.markets).map((sig) => sig.value)
    : [];
  // const isLive = event?.status === "In progress";
  const homeGoals =
    live?.scoreBoard && "goals" in live.scoreBoard
      ? (live.scoreBoard.goals as { h: number; g: number }).h || 0
      : 0;
  const awayGoals =
    live?.scoreBoard && "goals" in live.scoreBoard
      ? (live.scoreBoard.goals as { h: number; g: number }).g || 0
      : 0;

  const normalizeScoreboard = normalizeScoreboardFast(event?.live?.scoreBoard);

  const rawTime =
    event?.live?.status?.time ||
    event?.live?.clock?.clock_seconds ||
    normalizeScoreboard?.clock?.seconds ||
    null;

  const showClock =
    (event?.status === 1 || event?.status === 2 || event?.status === 3) &&
    !!event &&
    rawTime !== null &&
    event?.live?.clock?.clock_status !== "stopped";

  useImperativeLiveClock(clockRef, rawTime, showClock);

  const getSelectedMarket = useCallback(
    (marketSlug: string): number => {
      const marketId = markets.find((m) => m.name === marketSlug)?.id ?? 1;
      if (marketId) return marketId;
      if (allowAutoSelect) return markets[0]?.id ?? 1;
      return 0;
    },
    [markets, allowAutoSelect],
  );

  // Get winner market (usually the first market)
  const selectedMarket = marketId ?? getSelectedMarket(marketSlug ?? "");

  const [compact, setCompact] = useState<number>();
  const matchRef = useRef<HTMLDivElement>(null);
  const [rootWidthPx, setRootWidthPx] = useState<number>(0);

  // Track live elapsed seconds and auto-increment every second while live
  const [liveSeconds, setLiveSeconds] = useState<number | null>(null);

  console.log("event---------", event);

  // const parseLiveTime = (t: any): number | null => {
  //   if (t == null) return null;
  //   if (typeof t === "number") return t;
  //   if (typeof t === "string") {
  //     const parts = t.split(":").map((p) => parseInt(p, 10));
  //     if (parts.length === 2 && !isNaN(parts[0]))
  //       return parts[0] * 60 + (isNaN(parts[1]) ? 0 : parts[1]);
  //     if (parts.length === 3 && !isNaN(parts[0]))
  //       return (
  //         parts[0] * 3600 +
  //         (isNaN(parts[1]) ? 0 : parts[1]) * 60 +
  //         (isNaN(parts[2]) ? 0 : parts[2])
  //       );
  //     const num = parseInt(t.replace(/\D/g, ""), 10);
  //     if (!isNaN(num)) return num * 60;
  //   }
  //   return null;
  // };

  const formatMMSS = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // useEffect(() => {
  //   if (!isLive) return;
  //   let timer: number | undefined;
  //   const raw = (live as any)?.status?.time ?? (live as any)?.scoreBoard?.time;
  //   const initial = parseLiveTime(raw);
  //   setLiveSeconds(initial);
  //   if (initial != null) {
  //     timer = window.setInterval(() => {
  //       setLiveSeconds((prev) => (prev != null ? prev + 1 : 1));
  //     }, 1000) as unknown as number;
  //   }
  //   return () => {
  //     if (timer) clearInterval(timer);
  //   };
  // }, [live?.status?.time, (live as any)?.scoreBoard?.time, event?.id, isLive]);

  useEffect(() => {
    if (panelCompactState.value === 1) {
      currentCompactState.value = compact;
      setCompact(1);
    } else if (panelCompactState.value === 3) {
      currentCompactState.value = compact;
      setCompact(3);
    } else {
      setCompact(currentCompactState.value || 2);
    }
  }, [panelCompactState.value]);

  const calculateWidth = useCallback(() => {
    setRootWidthPx(window.innerWidth);
  }, []);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      calculateWidth();
    });

    window.addEventListener("resize", calculateWidth);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", calculateWidth);
    };
  }, [calculateWidth]);

  useEffect(() => {
    if (rootWidthPx > 0) {
      if (rootWidthPx < 1600) {
        setCompact(1);
      } else if (rootWidthPx < 1900) {
        setCompact(2);
      } else if (rootWidthPx >= 1900) {
        setCompact(3);
      }
    }
  }, [rootWidthPx]);

  const eventPath = `/event-view/${isLive ? "live" : "pre-match"}/${event?.sport}/${event?.region}/${event?.league}/${event?.id}`;

  // const eventSig = storeState.value?.[match[0]];
  //                           const markets = eventSig?.value.markets;
  if (event?.isOutright) {
    if (!markets)
      return (
        <span className="flex items-center justify-center w-full py-4 text-[12px]">
          There is no available market
        </span>
      );
    return (
      <details
        key={eventId}
        open={true}
        className={`flex flex-col w-full gap-1 bg-[var(--background-element)] text-[var(--text-basic-color)] rounded-lg ${baseColorTheme.value === "light" ? "border border-[var(--border-color)]" : "border-none"}  group p-2 group/e`}
      >
        <summary className="flex w-full items-center gap-2 cursor-pointer justify-between">
          <span className="text-[14px]">
            {getTranslatedText(event?.competitors?.[0]?.name || "")}
          </span>
          <sl-icon
            name="chevron-down"
            className="w-4 h-4 opacity-60 chevron-down-icon ml-1 transition-transform duration-200 ease-out group-open/e:rotate-180"
          />
        </summary>
        <div className="flex flex-col w-full rounded-[8px] gap-2 p-2">
          {Object.values(markets || {}).map((market) => (
            <MarketComponent
              key={market?.id}
              marketId={market?.id.toString()} //temparary fix
              eventId={eventId}
            />
          ))}
        </div>
      </details>
    );
  }

  if (!selectedMarket) return null;

  return (
    <div
      ref={matchRef}
      className={`flex flex-col md:flex-row w-full cursor-pointer text-[14px] font-bold py-[10px] px-3 border-[1px] bg-[var(--sub-element-color)] border-[var(--border-color)] text-[var(--text-basic-color)] ${allowRounded ? "rounded-[8px]" : ""}`}
      style={{
        order: event?.league?.id ?? 999,
        // popularMatchesState.value?.[event?.sport]?.[event?.region]?.[
        //   event?.league
        // ]?.indexOf(event.id) ?? 999,
      }}
    >
      <span
        className={`text-[var(--text-sub-color)] w-[60px] text-[12px] flex shrink-0 gap-1 md:gap-0 md:flex-col md:h-full p-[4px] items-center justify-start md:justify-center md:text-right`}
      >
        {isLive ? (
          <>
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/icons/multiple.png`}
              className="w-[18px] object-contain"
              alt="live"
            />
            <span ref={clockRef}>00:00</span>
            {/* <>
              <span>{formatStartDate(event?.startDate || 0)}</span>
              <span>{formatStartTime(event?.startDate || 0)}</span>
            </> */}
          </>
        ) : (
          <>
            <span>
              {formatStartDate(new Date(event?.startTime || "").getTime() || 0)}
            </span>
            <span>
              {formatStartTime(new Date(event?.startTime || "").getTime() || 0)}
            </span>
          </>
        )}
      </span>
      <div className="flex flex-col md:flex-row w-full md:w-[calc(100%-60px)] h-full">
        <div
          className="flex flex-1 w-full md:max-w-[calc(50%)] px-1 min-w-0 overflow-hidden"
          onClick={(e) => {
            linkButtonOnClick(e, eventPath, setLocation);
          }}
        >
          {event?.isOutright ? (
            <>
              <span className="flex flex-1 h-full items-center text-ellipsis overflow-hidden font-bold">
                OutRight
              </span>
            </>
          ) : (
            <div className="flex flex-col min-w-0 h-full flex-1">
              <div className="flex gap-2 h-full items-center justify-start truncate text-ellipsis overflow-hidden">
                <img
                  key={`${event?.sport}-${homeTeam}`}
                  src={
                    getTeamlogo(event?.sport.name, homeTeam) ||
                    `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-home.png`
                  }
                  // onError={(e) => {
                  //   e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-home.png`;
                  // }}
                  className="w-[14px] h-[14px] object-contain shrink-0"
                  alt=""
                />
                {getTranslatedText(homeTeam) || homeTeam}
              </div>
              <div className="flex gap-2 h-full items-center justify-start truncate text-ellipsis overflow-hidden">
                <img
                  key={`${event?.sport}-${awayTeam}`}
                  src={
                    getTeamlogo(event?.sport.name, awayTeam) ||
                    `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.png`
                  }
                  onError={(e) => {
                    e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.png`;
                  }}
                  className="w-[14px] h-[14px] object-contain shrink-0"
                  alt=""
                />
                {getTranslatedText(awayTeam) || awayTeam}
              </div>
              {showLeague && (
                <div className="flex gap-[2px] h-full text-[11px] items-center justify-start truncate text-ellipsis overflow-hidden">
                  <div className="flex relative items-center w-[14px] h-[14px] justify-center rounded-full border border-[var(--primary-border-color)] p-[1px]">
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportsicons/${event?.sport}.png`}
                      onError={(e) => {
                        e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/icons/all-sports.png`;
                      }}
                      className={`w-[12px] h-[12px] ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"} object-contain shrink-0`}
                      alt=""
                    />
                  </div>
                  <div className="flex relative left-[-6px] z-[1] items-center overflow-hidden w-[14px] h-[14px] justify-center rounded-full border border-[var(--primary-border-color)] p-[1px]">
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/logo/leagues/${encodeURIComponent(event?.sport.name || "")}/${encodeURIComponent(event?.region.name || "")}/${encodeURIComponent(event?.league.name || "")}.webp`}
                      onError={(e) => {
                        e.currentTarget.src = `${getFlagIconFromregionName(event?.region.name || "")}`;
                        e.currentTarget.className =
                          "rounded-full w-[12px] h-[12px]";
                      }}
                      className="w-[12px] h-[12px] object-contain shrink-0"
                      alt=""
                    />
                  </div>
                  <span className="relative left-[-6px]">
                    {/* {translationState.value.translations?.[event.league || ""] ||
                    event.league ||
                    ""} */}
                    {/* {JSON.stringify(event.sport)} */}
                    {getTranslatedText(event?.league.name) ||
                      event?.league.name}
                  </span>
                </div>
              )}
            </div>
          )}
          {isLive && (
            <div className="flex flex-col justify-space-between px-2 items-center py-1 h-full">
              <span>{homeGoals}</span>
              <span>{awayGoals}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-1 w-full my-[5px] md:my-0 md:min-w-[calc(50%)] md:max-w-[calc(50%)] items-center justify-center">
          <Market marketId={selectedMarket} eventId={eventId} />
          {/* {compact !== 1 && (
          <Market
            market={totalsMarket?.market as MarketType}
            single={false}
            event={event}
          />
        )}
        {compact === 3 && (
          <Market
            market={handicapMarket?.market as MarketType}
            single={false}
            event={event}
          />
        )} */}
        </div>
      </div>
    </div>
  );
};
