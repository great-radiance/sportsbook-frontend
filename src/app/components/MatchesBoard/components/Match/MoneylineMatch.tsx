import { FunctionComponent } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { useLocation } from "wouter-preact";
import {
  isBetslipSelectionSelected,
  toggleBetslipSelection,
} from "@/helpers/betslipSelection";
import { linkButtonOnClick } from "@/helpers/linkButtonClick";
import {
  currentCompactState,
  panelCompactState,
} from "@/state/panelCompactState";
import { storeState } from "@/state/storeState";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { useImperativeLiveClock } from "@/hooks/useLiveClock";
import {
  extractHandicapFigure,
  getOddName,
  getOnlyNumber,
} from "@/helpers/getOnlyNumber";
import type {
  competitor,
  tMarketModel,
  tSelectionValue,
} from "@/types/typesForSocket.ts/tEventModel";
import { isMobile } from "@/state/isMobile";
import { baseColorTheme } from "@/state/baseColorTheme";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { isBuilding } from "@/state/betState";
import { OddsMoveIndicator } from "@/app/components/OddsMoveIndicator";

interface MoneylineMatchProps {
  eventId: number;
}

const formatStartTime = (timestamp: number): string => {
  try {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return "00:00";
  }
};

const formatStartDate = (timestamp: number): string => {
  try {
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${day}/${month}`;
  } catch {
    return "00/00";
  }
};

/**
 * Read the value of a competitor's score off the new `scoreboard` payload.
 * Position 1 = home, 2 = away. Falls back to `homeGameScore`/`awayGameScore`
 * if the per-competitor `results[]` entry is missing.
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

/** Selections as plain values; optional bet-builder-only filter. */
const marketSelections = (
  market: tMarketModel | undefined,
  betBuilderOnly: boolean,
): tSelectionValue[] =>
  (market?.selections ?? [])
    .map((sig) => sig?.value)
    .filter((s): s is tSelectionValue => !!s)
    .filter((s) => !betBuilderOnly || s.isBetBuilderSupported);

function pairSelectionsForTeams(
  selections: tSelectionValue[],
  competitors: competitor[],
): [tSelectionValue | undefined, tSelectionValue | undefined] {
  const c0 = competitors[0];
  const c1 = competitors[1];
  if (selections.length < 2 || !c0?.id || !c1?.id) {
    return [selections[0], selections[1]];
  }
  const forId = (id: number) => selections.find((s) => s.competitionId === id);
  const a = forId(c0.id);
  const b = forId(c1.id);
  if (a && b && a.id !== b.id) return [a, b];
  return [selections[0], selections[1]];
}

function spreadSortKey(odd: tSelectionValue | undefined): number | null {
  if (!odd) return null;
  const name = getOddName(odd.name as Parameters<typeof getOddName>[0]);
  if (!name || typeof name !== "string") return null;
  const fig = extractHandicapFigure(name);
  if (!fig) return null;
  const n = parseFloat(fig.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Put favorite (negative / lower handicap line) first to match board convention. */
function favoriteFirstPermutation(
  pairedMl: [tSelectionValue | undefined, tSelectionValue | undefined],
  pairedSp: [tSelectionValue | undefined, tSelectionValue | undefined],
): readonly [number, number] {
  const s0 = spreadSortKey(pairedSp[0]);
  const s1 = spreadSortKey(pairedSp[1]);
  if (s0 != null && s1 != null && s0 !== s1) {
    return s0 < s1 ? [0, 1] : [1, 0];
  }
  const p0 = pairedMl[0]?.price;
  const p1 = pairedMl[1]?.price;
  if (
    p0 != null &&
    p1 != null &&
    Number.isFinite(p0) &&
    Number.isFinite(p1) &&
    p0 !== p1
  ) {
    return p0 < p1 ? [0, 1] : [1, 0];
  }
  return [0, 1];
}

function pickSpreadMarket(
  boardMarkets: tMarketModel[],
  competitors: competitor[],
  betBuilderOnly: boolean,
): tMarketModel | undefined {
  const candidates = boardMarkets.filter((m) => {
    const n = m.name.toLowerCase();
    return n.includes("handicap") && !n.includes("3-");
  });
  if (candidates.length === 0) return undefined;
  const pool = candidates.filter(
    (m) => marketSelections(m, betBuilderOnly).length === 2,
  );
  const scan = pool.length > 0 ? pool : candidates;
  let best = scan[0];
  let bestScore = -1;
  for (const m of scan) {
    const sels = marketSelections(m, betBuilderOnly);
    if (sels.length !== 2) continue;
    const [a, b] = pairSelectionsForTeams(sels, competitors);
    const aligned = !!(a && b && a.id !== b.id);
    const score = aligned ? 2 : 1;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

function oddLabel(
  _market: tMarketModel | undefined,
  odd: tSelectionValue | undefined,
  _index: number,
  kind: "moneyline" | "spread" | "total",
): string {
  if (!odd) return "—";
  const name = getOddName(odd.name as Parameters<typeof getOddName>[0]);
  if (kind === "moneyline") return "";
  const num = getOnlyNumber(name as string);
  if (kind === "spread") {
    const fig = typeof name === "string" ? extractHandicapFigure(name) : null;
    if (!fig) return "—";
    return fig.startsWith("-") || fig.startsWith("+") ? fig : `+${fig}`;
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
  const baseTheme = baseColorTheme.value;
  const [, setLocation] = useLocation();
  const clockRef = useRef<HTMLSpanElement>(null);

  const isLive = event?.status === 3;

  const competitors = event?.competitors || [];

  const markets = event?.markets
    ? Object.values(event.markets).map((sig) => sig.value)
    : [];

  const boardMarkets = isBuilding.value
    ? markets.filter((m) => m.isBetBuilderSupported)
    : markets;

  // Heuristic market pickers — `tMarketModel` no longer carries a `column`
  // field; the column count is implicit in `selections.length`.
  const moneylineMarket = boardMarkets
    .filter((m) => {
      const n = m.name.toLowerCase();
      return (
        n.includes("match result") ||
        n.includes("winner") ||
        n.includes("moneyline")
      );
    })
    .find((m) => m.isBestLine);
  const spreadMarket = pickSpreadMarket(
    boardMarkets,
    competitors,
    isBuilding.value,
  );
  const totalMarket = boardMarkets.find((m) => {
    const n = m.name.toLowerCase();
    return (
      n.includes("total goals") || (n.includes("total") && n.includes("over"))
    );
  });

  const scoreboard = event?.scoreboard;
  const homeGoals = getCompetitorScore(scoreboard, 1);
  const awayGoals = getCompetitorScore(scoreboard, 2);

  const rawTime = typeof scoreboard?.time === "number" ? scoreboard.time : null;
  const showClock = isLive && rawTime !== null;

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

  const startMs = new Date(event?.startTime || "").getTime() || 0;

  const eventPath = event
    ? `/event-view/${isLive ? "live" : "pre-match"}/${event.sport.name}/${event.sport.id}/${event.region.name}/${event.region.id}/${event.league.name}/${event.league.id}/${event.id}`
    : "#";

  const mlOddsRaw = marketSelections(moneylineMarket, isBuilding.value);
  const spOddsRaw = marketSelections(spreadMarket, isBuilding.value);
  const totOddsRaw = marketSelections(totalMarket, isBuilding.value);

  const mlPair = pairSelectionsForTeams(mlOddsRaw, competitors);
  const spPair = pairSelectionsForTeams(spOddsRaw, competitors);
  const totPair = pairSelectionsForTeams(totOddsRaw, competitors);

  const rowOrder = favoriteFirstPermutation(mlPair, spPair);
  const mlOdds = rowOrder.map((i) => mlPair[i]);
  const spOdds = rowOrder.map((i) => spPair[i]);
  const totOdds = rowOrder.map((i) => totPair[i]);

  const teamFirst =
    competitors[rowOrder[0]]?.name || competitors[0]?.name || "Team 1";
  const teamSecond =
    competitors[rowOrder[1]]?.name || competitors[1]?.name || "Team 2";

  const scoreFirst = rowOrder[0] === 0 ? homeGoals : awayGoals;
  const scoreSecond = rowOrder[1] === 0 ? homeGoals : awayGoals;

  const renderOddButton = (
    odd: tSelectionValue | undefined,
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
    const suspended = odd.status === 1;
    const closed = odd.status === 2 || odd.status === 3;
    const lineText = oddLabel(market, odd, index, kind);
    const selected = isBetslipSelectionSelected(
      eventId,
      String(market.id),
      odd.id,
    );

    if (closed) {
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
        className={`relative flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 rounded-[8px] px-2 py-1.5 transition-colors ${
          isMobile.value ? "" : "hover:bg-[var(--primary-color)]"
        } ${selected ? "bg-[var(--primary-color)] text-white/90" : "text-[var(--text-basic-color)] bg-[var(--sub-element-secondary)] border border-[var(--border-color)] group group-hover:text-white"}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleBetslipSelection({
            eventId,
            marketKey: String(market.id),
            marketName: market.name,
            selection: odd,
            apiMarketId: market.id,
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
          {odd.price != null ? odd.price.toFixed(2) : "—"}
        </span>
        <OddsMoveIndicator mv={odd.mv} />
      </button>
    );
  };

  if (!event) return null;

  return (
    <div
      ref={matchRef}
      className="flex w-full cursor-pointer flex-col overflow-hidden rounded-[8px] border border-[var(--border-color)] bg-[var(--sub-element-color)] text-[var(--text-basic-color)]"
      style={{
        order: event.league?.id ?? 999,
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] bg-[var(--sub-element-secondary)] px-3 pr-5 py-2">
        <div className="flex gap-[2px] h-full text-[11px] items-center justify-start truncate text-ellipsis overflow-hidden">
          <div className="flex relative items-center w-[14px] h-[14px] justify-center rounded-full border border-[var(--primary-border-color)] p-[1px]">
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportsicons/${event.sport?.name}.png`}
              onError={(e) => {
                e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/icons/all-sports.png`;
              }}
              className={`w-[12px] h-[12px] ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"} object-contain shrink-0`}
              alt=""
            />
          </div>
          <div className="flex relative left-[-6px] z-[1] items-center overflow-hidden w-[14px] h-[14px] justify-center rounded-full border border-[var(--primary-border-color)] p-[1px]">
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/logo/leagues/${encodeURIComponent(event.sport?.name || "")}/${encodeURIComponent(event.region?.name || "")}/${encodeURIComponent(event.league?.name || "")}.webp`}
              className="w-[12px] h-[12px] object-contain shrink-0"
              onError={(e) => {
                e.currentTarget.src = `${getFlagIconFromregionName(event.region?.name || "")}`;
                e.currentTarget.className = "rounded-full w-[14px] h-[14px]";
              }}
              alt=""
            />
          </div>
          <span>{event.league?.name}</span>
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

      <div className="flex gap-2 p-2 justify-between md:items-stretch md:gap-3 md:p-3 h-full">
        <div
          className="flex min-w-0 md:flex-1 flex-col gap-2 md:max-w-[48%] h-full"
          onClick={(e) => {
            linkButtonOnClick(e, eventPath, setLocation);
          }}
        >
          {event.isOutright ? (
            <span className="truncate font-bold">OutRight</span>
          ) : (
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
                      {formatStartDate(startMs)} {formatStartTime(startMs)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {/* Team logo omitted — names only. */}
                    {/*
                    <img
                      src={
                        cachedTeamLogoUrl(event.sport?.name, homeTeam) ||
                        `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-home.png`
                      }
                      className="h-3.5 w-3.5 shrink-0 object-contain"
                      alt=""
                    />
                    */}
                    <span className="truncate text-[13px] font-bold">
                      {teamFirst}
                    </span>
                  </div>
                  {isLive && (
                    <span className="shrink-0 text-[13px] font-bold tabular-nums">
                      {scoreFirst}
                    </span>
                  )}
                </div>
              </div>
              <div className="h-[1px] bg-[var(--border-color)] w-full" />
              <div className="flex items-center justify-between gap-2 h-full">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {/*
                  <img
                    src={
                      cachedTeamLogoUrl(event.sport?.name, awayTeam) ||
                      `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.png`
                    }
                    className="h-3.5 w-3.5 shrink-0 object-contain"
                    alt=""
                    onError={(e) => {
                      e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.png`;
                    }}
                  />
                  */}
                  <span className="truncate text-[13px] font-bold">
                    {teamSecond}
                  </span>
                </div>
                {isLive && (
                  <span className="shrink-0 text-[13px] font-bold tabular-nums">
                    {scoreSecond}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className="grid min-w-0 flex-1 grid-cols-3 gap-1.5 max-w-[52%]"
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
