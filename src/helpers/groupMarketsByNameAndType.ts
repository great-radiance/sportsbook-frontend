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

export const marketIdSort = (
  ids: string[],
  markets: tMarketModel[],
): string[] => {
  return ids.sort((a, b) => {
    const aSelections = markets.find((m) => m.id === parseInt(a))?.selections;
    const bSelections = markets.find((m) => m.id === parseInt(b))?.selections;
    return (
      aSelections?.[0]?.value?.name?.localeCompare(
        bSelections?.[0]?.value?.name ?? "",
      ) ?? 0
    );
  });
};
