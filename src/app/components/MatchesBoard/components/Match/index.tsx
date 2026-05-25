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
import { baseColorTheme } from "@/state/baseColorTheme";
import { useImperativeLiveClock } from "@/hooks/useLiveClock";
import { MoneylineMatch } from "./MoneylineMatch";
import { RacingMatch } from "./RacingMatch";
import { isRacingSport } from "@/helpers/isRacingSport";
import { getRegionNameById } from "@/shared/utils/Resion";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { MarketComponent } from "@/app/components/MarketsBoard/components/MarketComponent";
import { groupMarketsByNameAndType } from "@/helpers/groupMarketsByNameAndType";
import { isBuilding } from "@/state/betState";

interface MatchProps {
  eventId: number;
  marketType?: number;
  marketId?: number;
  showLeagueLogo?: boolean;
  allowAutoSelect?: boolean; // If true, will auto-select the first market if no marketSlug match is found
  allowRounded?: boolean;
}

import { formatStartDate, formatStartTime } from "@/helpers/formatEventTime";

export { formatStartDate, formatStartTime };

/**
 * Read a competitor's score from the new scoreboard shape.
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

export const Match: FunctionComponent<MatchProps> = ({
  eventId,
  marketType,
  marketId,
  // isLive = false,
  allowAutoSelect = false,
  showLeagueLogo = false,
  allowRounded = false,
}) => {
  const event = storeState.value[eventId]?.value;
  if (!event) return null;

  const showLeague =
    showLeagueLogo || event?.sport.id === 1 || event?.sport.id === 8;

  const isLive = event?.status === 3;

  const [, setLocation] = useLocation();
  const baseTheme = baseColorTheme.value;
  const clockRef = useRef<HTMLSpanElement>(null);

  const participants = event?.competitors || [];
  const homeTeam = participants[0]?.name || "Team 1";
  const awayTeam = participants[1]?.name || "Team 2";

  const markets = event?.markets
    ? Object.values(event.markets).map((sig) => sig.value)
    : [];

  console.log("markets", markets);

  const scoreboard = event?.scoreboard;
  const homeGoals = getCompetitorScore(scoreboard, 1);
  const awayGoals = getCompetitorScore(scoreboard, 2);

  const rawTime = typeof scoreboard?.time === "number" ? scoreboard.time : null;
  const showClock = isLive && rawTime !== null && rawTime > 0;

  useImperativeLiveClock(clockRef, rawTime, showClock);

  const getSelectedMarket = useCallback(
    (marketType: number): number => {
      const marketId = markets.find((m) => m.type === marketType)?.id;
      if (marketId) return marketId;
      if (allowAutoSelect) {
        for (const market of markets) {
          if (market.selections.length < 4) {
            return market.id;
          }
        }
      }
      return 0;
    },
    [markets, allowAutoSelect],
  );

  // Get winner market (usually the first market)
  const selectedMarket = marketId ?? getSelectedMarket(marketType ?? 0);
  const selectionCount =
    markets.find((m) => m.id === selectedMarket)?.selections?.length ?? 0;
  const longMarket = selectionCount > 3;
  // console.log(
  //   "event",
  //   event,
  //   // markets,
  //   markets[0]?.id,
  //   selectedMarket,
  //   storeState.value[eventId]?.value?.markets[selectedMarket]?.value,
  // );

  const [compact, setCompact] = useState<number>();
  const matchRef = useRef<HTMLDivElement>(null);
  const [rootWidthPx, setRootWidthPx] = useState<number>(0);

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

  const eventPath = `/event-view/${isLive ? "live" : "pre-match"}/${event?.sport.name}/${event?.sport.id}/${event?.region.name}/${event?.region.id}/${event?.league.name}/${event?.league.id}/${event?.id}`;

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
            {event?.competitors?.[0]?.name || ""}
          </span>
          <sl-icon
            name="chevron-down"
            className="w-4 h-4 opacity-60 chevron-down-icon ml-1 transition-transform duration-200 ease-out group-open/e:rotate-180"
          />
        </summary>
        <div className="flex flex-col w-full rounded-[8px] gap-2 p-2">
          {groupMarketsByNameAndType(
            isBuilding.value
              ? (markets ?? []).filter((m) => m.isBetBuilderSupported)
              : (markets ?? []),
          ).map((group) => (
            <MarketComponent
              key={group.key}
              marketId={group.ids.length === 1 ? group.ids[0] : group.ids}
              eventId={eventId}
              type={group.type}
            />
          ))}
        </div>
      </details>
    );
  }

  // console.log("Match", event);
  if (isRacingSport(event.sport?.id, event.sport?.name)) {
    return <RacingMatch eventId={eventId} allowRounded={allowRounded} />;
  }

  if (!selectedMarket) return;

  return (
    <div
      ref={matchRef}
      className={`flex flex-col md:flex-row w-full cursor-pointer text-[14px] font-bold py-[10px] px-3 border-[1px] bg-[var(--sub-element-color)] border-[var(--border-color)] text-[var(--text-basic-color)] ${allowRounded ? "rounded-[8px]" : ""}`}
      style={
        {
          // order: event?.league?.id ?? 999,
          // popularMatchesState.value?.[event?.sport]?.[event?.region]?.[
          //   event?.league
          // ]?.indexOf(event.id) ?? 999,
        }
      }
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
          className={`flex flex-1 w-full md:max-w-[calc(50%)] px-1 min-w-0 overflow-hidden ${longMarket ? "md:max-w-[calc(30%)]" : ""}`}
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
                {/* Team logo omitted — names only. */}

                <img
                  key={`${event?.sport}-${homeTeam}`}
                  src={
                    `${event?.competitors[0]?.logo || ""}` ||
                    `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-home.png`
                  }
                  onError={(e) => {
                    e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.png`;
                  }}
                  className="w-[14px] h-[14px] object-contain shrink-0"
                  alt=""
                />

                {homeTeam}
              </div>
              <div className="flex gap-2 h-full items-center justify-start truncate text-ellipsis overflow-hidden">
                <img
                  key={`${event?.sport}-${awayTeam}`}
                  src={
                    `${event.competitors[1].logo || ""}` ||
                    `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.png`
                  }
                  onError={(e) => {
                    e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.png`;
                  }}
                  className="w-[14px] h-[14px] object-contain shrink-0"
                  alt=""
                />

                {awayTeam}
              </div>
              {showLeague && (
                <div className="flex gap-[2px] h-full text-[11px] items-center justify-start truncate text-ellipsis overflow-hidden">
                  <div className="flex relative items-center w-[14px] h-[14px] justify-center rounded-full border border-[var(--primary-border-color)] p-[1px]">
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${event?.sport.id}.svg`}
                      onError={(e) => {
                        e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
                      }}
                      className={`w-[12px] h-[12px] ${baseTheme === "dark" ? "invert" : ""} object-contain shrink-0`}
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
                    {event?.league.name}
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

        <div
          className={`flex gap-2 flex-1 w-full my-[5px] md:my-0 md:min-w-[calc(50%)] md:max-w-[calc(50%)] items-center justify-center ${longMarket ? "md:max-w-[calc(70%)]" : ""}`}
        >
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
