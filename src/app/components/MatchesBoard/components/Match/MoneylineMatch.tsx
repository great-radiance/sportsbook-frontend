import { FunctionComponent } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { useLocation } from "wouter-preact";
import { handleClickOdd, isSelected } from "./Market";
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
import { useImperativeLiveClock } from "@/hooks/useLiveClock";
import { normalizeScoreboardFast } from "@/helpers/normalizeScoreboard";
import { getOddName, getOnlyNumber } from "@/helpers/getOnlyNumber";
import type { tMarketModel } from "@/types/typesForSocket.ts/tEventModel";
import { tOdd } from "@/types/tEvent";
import { isMobile } from "@/state/isMobile";
import { baseColorTheme } from "@/state/baseColorTheme";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";

interface MoneylineMatchProps {
  eventId: number;
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

function sortedOdds(market: tMarketModel | undefined): tOdd[] {
  if (!market?.odds?.oddIdList?.length) return [];
  return market.odds.oddIdList
    .map((id) => market.odds.odds[id]?.value)
    .filter((v): v is NonNullable<typeof v> => v != null) as unknown as tOdd[];
}

function oddLabel(
  _market: tMarketModel | undefined,
  odd: tOdd | undefined,
  _index: number,
  kind: "moneyline" | "spread" | "total",
): string {
  if (!odd) return "—";
  const name = getOddName(odd.name as Parameters<typeof getOddName>[0]);
  if (kind === "moneyline") {
    return "";
  }
  const num = getOnlyNumber(name as string);
  if (kind === "spread") {
    return num
      ? num.startsWith("-") || num.startsWith("+")
        ? num
        : `+${num}`
      : name || "—";
  }
  if (kind === "total") {
    const lower = (name || "").toLowerCase();
    const prefix = lower.includes("under")
      ? "U"
      : lower.includes("over")
        ? "O"
        : "";
    return num ? `${prefix} ${num}`.trim() : name || "—";
  }
  return name || "—";
}

export const MoneylineMatch: FunctionComponent<MoneylineMatchProps> = ({
  eventId,
}) => {
  const event = storeState.value[eventId]?.value;
  const isLive = event?.status === "In progress";
  const baseTheme = baseColorTheme.value;
  const [, setLocation] = useLocation();
  const live = event?.live;
  const clockRef = useRef<HTMLSpanElement>(null);

  const participants = event?.participants || [];
  const homeTeam = participants[0]?.name || "Team 1";
  const awayTeam = participants[1]?.name || "Team 2";

  const markets = event?.markets
    ? Object.values(event.markets).map((sig) => sig.value)
    : [];

  const moneylineMarket = markets.find((m) => {
    const n = m.name.toLowerCase();
    return (
      (n.includes("match result") ||
        n.includes("winner") ||
        n.includes("moneyline")) &&
      m.column === 2
    );
  });
  const spreadMarket = markets.find((m) => {
    const n = m.name.toLowerCase();
    return n.includes("handicap") && !n.includes("3-") && m.column === 2;
  });
  const totalMarket = markets.find((m) => {
    const n = m.name.toLowerCase();
    return (
      (n.includes("total goals") ||
        (n.includes("total") && n.includes("over"))) &&
      m.column === 2
    );
  });

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
    event?.status !== "Finished" &&
    event?.status !== "Coverage lost" &&
    !!event &&
    rawTime !== null &&
    event?.live?.clock?.clock_status !== "stopped";

  useImperativeLiveClock(clockRef, rawTime, showClock);

  const [compact, setCompact] = useState<number>();
  const matchRef = useRef<HTMLDivElement>(null);
  const [rootWidthPx, setRootWidthPx] = useState<number>(0);

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

  const mlOdds = sortedOdds(moneylineMarket);
  const spOdds = sortedOdds(spreadMarket);
  const totOdds = sortedOdds(totalMarket);

  const renderOddButton = (
    odd: tOdd | undefined,
    market: tMarketModel | undefined,
    index: number,
    kind: "moneyline" | "spread" | "total",
  ) => {
    if (!market || !odd) {
      return (
        <div
          key={`empty-${kind}-${index}`}
          className="flex min-h-[52px] items-center justify-center rounded-[8px] border border-[var(--border-color)] bg-[var(--sub-element-secondary)] px-2"
        >
          <span className="text-[12px] text-[var(--text-sub-color)]">—</span>
        </div>
      );
    }
    const oddName =
      getOddName(odd.name as Parameters<typeof getOddName>[0]) || "";
    const suspended = odd.status === "suspended";
    const deleted = odd.status === "deleted";
    const lineText = oddLabel(market, odd, index, kind);
    const selected = isSelected(odd.id);

    if (deleted) {
      return (
        <div
          key={odd.id}
          className="flex min-h-[52px] items-center justify-center rounded-[8px] border border-[var(--border-color)] bg-[var(--sub-element-secondary)] px-2"
        >
          <span className="text-[12px]">—</span>
        </div>
      );
    }
    if (suspended) {
      return (
        <div
          key={odd.id}
          className="flex min-h-[52px] items-center justify-center rounded-[8px] border border-[var(--border-color)] bg-[var(--sub-element-secondary)] px-2"
        >
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/lock.png`}
            className="h-4 w-4 brightness-0 invert"
            alt=""
          />
        </div>
      );
    }

    return (
      <button
        key={odd.id}
        type="button"
        className={`flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 rounded-[8px] px-2 py-1.5 transition-colors ${
          isMobile.value ? "" : "hover:bg-[var(--primary-color)]"
        } ${selected ? "bg-[var(--primary-color)] text-white/90" : "text-[var(--text-basic-color)] bg-[var(--sub-element-secondary)] border border-[var(--border-color)] group group-hover:text-white"}`}
        onClick={(e) => {
          e.stopPropagation();
          handleClickOdd({
            eventId: event?.id ?? 0,
            marketId: market.id,
            marketName: market.name,
            participants: event?.participants ?? [],
            startDate: event?.startDate ?? 0,
            oddId: odd.id,
            oddName: oddName,
            sportSlug: event?.sport ?? "",
          });
        }}
      >
        {kind !== "moneyline" && lineText ? (
          <span
            className={`text-center text-[11px] font-medium leading-tight ${
              selected
                ? "text-white/90"
                : `text-[var(--text-basic-color)] ${isMobile.value ? "" : "group-hover:text-white"}`
            }`}
          >
            {lineText}
          </span>
        ) : null}
        <span
          className={`text-[14px] font-bold ${
            selected
              ? "text-white/90"
              : `text-[var(--text-primary-color)] ${isMobile.value ? "" : "group-hover:text-white"}`
          }`}
        >
          {odd.value != null ? odd.value.toFixed(2) : "—"}
        </span>
      </button>
    );
  };

  if (!event) return null;

  return (
    <div
      ref={matchRef}
      className="flex w-full cursor-pointer flex-col overflow-hidden rounded-[8px] border border-[var(--border-color)] bg-[var(--sub-element-color)] text-[var(--text-basic-color)]"
      style={{
        order:
          popularMatchesState.value?.[event?.sport]?.[event?.region]?.[
            event?.league
          ]?.indexOf(event.id) ?? 999,
      }}
    >
      {/* Header: Matches + column titles */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] bg-[var(--sub-element-secondary)] px-3 pr-5 py-2">
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
              src={`${BASE_ASSET_PUBLIC_URL}/logo/leagues/${encodeURIComponent(event?.sport || "")}/${encodeURIComponent(event?.region || "")}/${encodeURIComponent(event?.league || "").toLowerCase()}.png`}
              className="w-[12px] h-[12px] object-contain shrink-0"
              onError={(e) => {
                e.currentTarget.src = `${getFlagIconFromregionName(event?.region || "")}`;
                e.currentTarget.className = "rounded-full w-[14px] h-[14px]";
              }}
              alt=""
            />
          </div>
          <span>
            {/* {translationState.value.translations?.[event.league || ""] ||
                    event.league ||
                    ""} */}
            {/* {JSON.stringify(event.sport)} */}
            {getTranslatedText(event?.league) || event?.league}
          </span>
        </div>
        <div className="grid min-w-0 grid-cols-3 gap-1 text-center md:min-w-[50%] md:max-w-[50%]">
          <span className="text-[11px] font-medium text-[var(--text-basic-color)]">
            Moneyline
          </span>
          <span className="text-[11px] font-medium text-[var(--text-basic-color)]">
            Spread
          </span>
          <span className="text-[11px] font-medium text-[var(--text-basic-color)]">
            Total
          </span>
        </div>
      </div>

      <div className="flex gap-2 p-2 md:items-stretch md:gap-3 md:p-3 h-full">
        {/* Left: status + teams + scores */}
        <div
          className="flex min-w-0 md:flex-1 flex-col gap-2 md:max-w-[48%] h-full"
          onClick={(e) => {
            linkButtonOnClick(e, eventPath, setLocation);
          }}
        >
          {event?.outright ? (
            <span className="truncate font-bold">OutRight</span>
          ) : (
            <>
              <div className="flex flex-col justify-space-between h-full">
                <div className="flex flex-col gap-2 h-full">
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-sub-color)]">
                    {isLive ? (
                      <>
                        <img
                          src={`${BASE_ASSET_PUBLIC_URL}/icons/multiple.png`}
                          className="h-4 w-4 shrink-0 object-contain"
                          alt=""
                        />
                        <span
                          ref={clockRef}
                          className="font-medium text-[var(--text-basic-color)]"
                        >
                          00:00
                        </span>
                      </>
                    ) : (
                      <span>
                        {formatStartDate(event?.startDate || 0)}{" "}
                        {formatStartTime(event?.startDate || 0)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <img
                        src={
                          getTeamlogo(event?.sport, homeTeam) ||
                          `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-home.png`
                        }
                        className="h-3.5 w-3.5 shrink-0 object-contain"
                        alt=""
                      />
                      <span className="truncate text-[13px] font-bold">
                        {getTranslatedText(homeTeam) || homeTeam}
                      </span>
                    </div>
                    {isLive && (
                      <span className="shrink-0 text-[13px] font-bold tabular-nums">
                        {homeGoals}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-[1px] bg-[var(--border-color)] w-full" />
                <div className="flex items-center justify-between gap-2 h-full">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <img
                      src={
                        getTeamlogo(event?.sport, awayTeam) ||
                        `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.png`
                      }
                      className="h-3.5 w-3.5 shrink-0 object-contain"
                      alt=""
                      onError={(e) => {
                        e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.png`;
                      }}
                    />
                    <span className="truncate text-[13px] font-bold">
                      {getTranslatedText(awayTeam) || awayTeam}
                    </span>
                  </div>
                  {isLive && (
                    <span className="shrink-0 text-[13px] font-bold tabular-nums">
                      {awayGoals}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: 3×2 odds grid */}
        <div
          className="grid min-w-0 flex-1 grid-cols-3 gap-1.5 md:max-w-[52%]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-1.5">
            {renderOddButton(mlOdds[0], moneylineMarket, 0, "moneyline")}
            {renderOddButton(mlOdds[1], moneylineMarket, 1, "moneyline")}
          </div>
          <div className="flex flex-col gap-1.5">
            {renderOddButton(spOdds[0], spreadMarket, 0, "spread")}
            {renderOddButton(spOdds[1], spreadMarket, 1, "spread")}
          </div>
          <div className="flex flex-col gap-1.5">
            {renderOddButton(totOdds[0], totalMarket, 0, "total")}
            {renderOddButton(totOdds[1], totalMarket, 1, "total")}
          </div>
        </div>
      </div>
    </div>
  );
};
