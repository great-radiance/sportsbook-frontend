import { tMarketModel } from "@/types/typesForSocket.ts/tEventModel";

/**
 * Sort markets by `type` (so markets of the same type cluster together) and
 * then collapse consecutive markets that share both `name` and `type` into a
 * single group. The returned `ids` arrays can be passed to `MarketComponent`,
 * which concatenates the merged markets' selections under one header.
 *
 * Example: four backend "1st half - total" markets (one per handicap 0.75,
 * 1.25, 1.75, 2.25) all share the same `name` + `type`, so they end up in
 * one group with 4 ids and 8 combined Over/Under selections.
 */
export const groupMarketsByNameAndType = (
  markets: tMarketModel[],
): { ids: string[]; key: string; type: number }[] => {
  const sorted = [...markets].sort((a, b) => a.type - b.type);
  const groups: { ids: string[]; key: string; name: string; type: number }[] =
    [];
  for (const m of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.name === m.name && last.type === m.type) {
      last.ids.push(String(m.id));
    } else {
      groups.push({
        ids: [String(m.id)],
        key: `${m.type}-${m.name}-${m.id}`,
        name: m.name,
        type: m.type,
      });
    }
  }
  return groups.map(({ ids, key, type }) => ({
    ids: marketIdSort(ids, markets),
    key,
    type,
  }));
};

/** First signed number in a selection label (e.g. "over 9.5" → 9.5, "Team -11.5" → -11.5). */
function lineNumberFromSelectionName(name: string | undefined): number | null {
  if (!name) return null;
  const trailing = name.match(/([+-]?\d+(?:\.\d+)?)\s*$/);
  if (trailing) {
    const n = parseFloat(trailing[1]);
    if (Number.isFinite(n)) return n;
  }
  const matches = [...name.matchAll(/([+-]?\d+(?:\.\d+)?)/g)];
  if (matches.length === 0) return null;
  const n = parseFloat(matches[matches.length - 1][1]);
  return Number.isFinite(n) ? n : null;
}

function compareBySelectionLine(
  aName: string | undefined,
  bName: string | undefined,
): number {
  const aLine = lineNumberFromSelectionName(aName);
  const bLine = lineNumberFromSelectionName(bName);
  if (aLine !== null && bLine !== null) return aLine - bLine;
  if (aLine !== null) return -1;
  if (bLine !== null) return 1;
  return (aName ?? "").localeCompare(bName ?? "");
}

export const marketIdSort = (
  ids: string[],
  markets: tMarketModel[],
): string[] => {
  const marketById = new Map(markets.map((m) => [m.id, m]));
  return [...ids].sort((a, b) => {
    const aName = marketById.get(parseInt(a, 10))?.selections?.[0]?.value?.name;
    const bName = marketById.get(parseInt(b, 10))?.selections?.[0]?.value?.name;
    return compareBySelectionLine(aName, bName);
  });
};
