import type {
  competitor,
  tEventModel,
  tMarketModel,
  tSelectionValue,
} from "@/types/typesForSocket.ts/tEventModel";
import { getOddName, getOnlyNumber } from "@/helpers/getOnlyNumber";

export type UpcomingMarketSlot = {
  market: tMarketModel | undefined;
};

export type UpcomingMatchMarkets = {
  matchResult: UpcomingMarketSlot;
  overUnder: UpcomingMarketSlot;
  ggNg: UpcomingMarketSlot;
};

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

export function resolveUpcomingMatchMarkets(
  markets: tMarketModel[],
): UpcomingMatchMarkets {
  return {
    matchResult: { market: pickMatchResult(markets) },
    overUnder: { market: pickOverUnder(markets) },
    ggNg: { market: pickGgNg(markets) },
  };
}

export function eventHasStoredMarkets(event: tEventModel | undefined): boolean {
  if (!event?.markets) return false;
  const markets = Object.values(event.markets).map((sig) => sig.value);
  const slots = resolveUpcomingMatchMarkets(markets);
  return Boolean(
    slots.matchResult.market ||
      slots.overUnder.market ||
      slots.ggNg.market,
  );
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

/** Both teams to score row: two labeled cells (Yes / No). */
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

function namesMatch(a: string, b: string): boolean {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

function bttsYesNoPart(part: string): string {
  const p = part.trim().toLowerCase();
  if (p === "yes" || p.startsWith("yes")) return "Yes";
  if (p === "no" || p.startsWith("no")) return "No";
  const trimmed = part.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase() : "—";
}

/** Map home/away/draw (or team name) to 1 / X / 2 for combo BTTS labels. */
function resultSidePart(
  part: string,
  competitors?: competitor[],
): string {
  const p = part.trim().toLowerCase();
  if (p === "1" || p === "home") return "1";
  if (p === "2" || p === "away") return "2";
  if (p === "x" || p === "draw" || p === "tie") return "X";

  const home = competitors?.[0]?.name?.trim();
  const away = competitors?.[1]?.name?.trim();
  if (home && namesMatch(p, home)) return "1";
  if (away && namesMatch(p, away)) return "2";

  return part.trim();
}

export function ggNgButtonLabel(
  selection: tSelectionValue | undefined,
  competitors?: competitor[],
): string {
  if (!selection) return "—";
  const raw = String(
    getOddName(selection.name as never) ?? selection.name ?? "",
  ).trim();
  if (!raw) return "—";

  const amp = raw.indexOf("&");
  if (amp >= 0) {
    const left = raw.slice(0, amp);
    const right = raw.slice(amp + 1);
    return `${resultSidePart(left, competitors)} & ${bttsYesNoPart(right)}`;
  }

  return bttsYesNoPart(raw);
}

export function thirdColumnSelectionLabel(
  selection: tSelectionValue | undefined,
  competitors?: competitor[],
): string {
  return ggNgButtonLabel(selection, competitors);
}
