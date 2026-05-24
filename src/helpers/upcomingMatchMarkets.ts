import type { tEventModel } from "@/types/typesForSocket.ts/tEventModel";
import type {
  tMarketModel,
  tSelectionValue,
} from "@/types/typesForSocket.ts/tEventModel";
import {
  extractHandicapFigure,
  getOddName,
  getOnlyNumber,
} from "@/helpers/getOnlyNumber";
import { isMoneylineSport } from "@/helpers/sidebarMarketNavigation";

export type UpcomingMarketSlot = {
  market: tMarketModel | undefined;
};

export type UpcomingMatchMarkets = {
  matchResult: UpcomingMarketSlot;
  overUnder: UpcomingMarketSlot;
  ggNg: UpcomingMarketSlot;
  handicap: UpcomingMarketSlot;
};

export type UpcomingThirdColumnKind = "ggNg" | "handicap";

export function marketSelections(
  market: tMarketModel | undefined,
): tSelectionValue[] {
  return (market?.selections ?? [])
    .map((sig) => sig?.value)
    .filter((s): s is tSelectionValue => !!s);
}

function pickMatchResult(markets: tMarketModel[]): tMarketModel | undefined {
  const byType = markets.find((m) => m.type === 1);
  if (byType) return byType;

  const candidates = markets.filter((m) => {
    const n = m.name.toLowerCase();
    return (
      n.includes("match result") ||
      n.includes("winner") ||
      n.includes("moneyline")
    );
  });
  return candidates.find((m) => m.isBestLine) ?? candidates[0];
}

function pickOverUnder(markets: tMarketModel[]): tMarketModel | undefined {
  const byType = markets.find((m) => m.type === 66);
  if (byType) return byType;

  const candidates = markets.filter((m) => {
    const n = m.name.toLowerCase();
    return (
      (n.includes("total goals") && n.includes("over")) ||
      (n.includes("over/under") && !n.includes("match")) ||
      (n.includes("total") && n.includes("over") && !n.includes("team"))
    );
  });
  return (
    candidates.find((m) => marketSelections(m).length === 2) ?? candidates[0]
  );
}

function pickGgNg(markets: tMarketModel[]): tMarketModel | undefined {
  return markets.find((m) => {
    if (m.type === 86) return true;
    const n = m.name.toLowerCase();
    return n.includes("both teams") && n.includes("score");
  });
}

function pickHandicap(markets: tMarketModel[]): tMarketModel | undefined {
  const candidates = markets.filter((m) => {
    const n = m.name.toLowerCase();
    return n.includes("handicap") && !n.includes("3-");
  });
  return (
    candidates.find((m) => marketSelections(m).length === 2) ?? candidates[0]
  );
}

export function resolveUpcomingMatchMarkets(
  markets: tMarketModel[],
): UpcomingMatchMarkets {
  return {
    matchResult: { market: pickMatchResult(markets) },
    overUnder: { market: pickOverUnder(markets) },
    ggNg: { market: pickGgNg(markets) },
    handicap: { market: pickHandicap(markets) },
  };
}

export function eventHasStoredMarkets(event: tEventModel | undefined): boolean {
  if (!event?.markets) return false;
  const markets = Object.values(event.markets).map((sig) => sig.value);
  const slots = resolveUpcomingMatchMarkets(markets);
  return Boolean(
    slots.matchResult.market ||
      slots.overUnder.market ||
      slots.ggNg.market ||
      slots.handicap.market,
  );
}

export function resolveThirdColumnKind(
  slots: UpcomingMatchMarkets,
  sportId: number,
  sportName?: string,
): UpcomingThirdColumnKind {
  if (
    isMoneylineSport(sportId, sportName) &&
    !slots.ggNg.market &&
    slots.handicap.market
  ) {
    return "handicap";
  }
  return "ggNg";
}

export function thirdColumnSlot(
  slots: UpcomingMatchMarkets,
  kind: UpcomingThirdColumnKind,
): UpcomingMarketSlot {
  return kind === "handicap" ? slots.handicap : slots.ggNg;
}

/** Match-result row: up to 3 cells (1 / X / 2). */
export function matchResultCells(
  market: tMarketModel | undefined,
): (tSelectionValue | undefined)[] {
  const selections = marketSelections(market);
  const cells: (tSelectionValue | undefined)[] = selections.slice(0, 3);
  while (cells.length < 3) cells.push(undefined);
  return cells;
}

function selectionSortKey(name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes("over")) return 0;
  if (lower.includes("under")) return 1;
  return 2;
}

/** Over/under row: always [over, under] when both exist. */
export function overUnderCells(
  market: tMarketModel | undefined,
): [tSelectionValue | undefined, tSelectionValue | undefined] {
  const sorted = [...marketSelections(market)].sort(
    (a, b) =>
      selectionSortKey(a.name) - selectionSortKey(b.name) ||
      a.id - b.id,
  );
  return [sorted[0], sorted[1]];
}

/** Third column row: two labeled cells (GG/NG or spread). */
export function thirdColumnCells(
  market: tMarketModel | undefined,
): [tSelectionValue | undefined, tSelectionValue | undefined] {
  const selections = marketSelections(market).slice(0, 2);
  return [selections[0], selections[1]];
}

export function overUnderButtonLabel(
  selection: tSelectionValue | undefined,
): string {
  if (!selection) return "—";
  const name = String(
    getOddName(selection.name as never) ?? selection.name ?? "",
  );
  const num = getOnlyNumber(name);
  const lower = name.toLowerCase();
  const prefix = lower.includes("under")
    ? "U"
    : lower.includes("over")
      ? "O"
      : "";
  return num ? `${prefix} ${num}`.trim() : name || "—";
}

export function ggNgButtonLabel(
  selection: tSelectionValue | undefined,
): string {
  if (!selection) return "—";
  const name = String(
    getOddName(selection.name as never) ?? selection.name ?? "",
  )
    .toLowerCase()
    .trim();
  if (name === "yes" || name.startsWith("yes")) return "Yes";
  if (name === "no" || name.startsWith("no")) return "No";
  return selection.name || "—";
}

export function spreadButtonLabel(
  selection: tSelectionValue | undefined,
): string {
  if (!selection) return "—";
  const name = String(
    getOddName(selection.name as never) ?? selection.name ?? "",
  );
  const fig = typeof name === "string" ? extractHandicapFigure(name) : null;
  if (!fig) return "—";
  return fig.startsWith("-") || fig.startsWith("+") ? fig : `+${fig}`;
}

export function thirdColumnSelectionLabel(
  kind: UpcomingThirdColumnKind,
  selection: tSelectionValue | undefined,
): string {
  return kind === "handicap"
    ? spreadButtonLabel(selection)
    : ggNgButtonLabel(selection);
}
