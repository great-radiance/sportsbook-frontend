import type { SystemCombinationPayload } from "@/api/bet/placeBet";
import { getOddsValue } from "@/helpers/getOddsValue";
import type { SelectedOddType } from "@/shared/utils/bet";

export type NamedSystem = {
  label: string;
  sizes: number[];
};

const NAMED_SYSTEMS: Record<number, NamedSystem> = {
  3: { label: "Trixie", sizes: [2, 3] },
  4: { label: "Yankee", sizes: [2, 3, 4] },
  5: { label: "Canadian", sizes: [2, 3, 4, 5] },
  6: { label: "Heinz", sizes: [2, 3, 4, 5, 6] },
  7: { label: "Super Heinz", sizes: [2, 3, 4, 5, 6, 7] },
  8: { label: "Goliath", sizes: [2, 3, 4, 5, 6, 7, 8] },
};

/** Stored separately from per-size keys (1–8) so named package stake does not mirror into other rows. */
export const NAMED_SYSTEM_STAKE_KEY = 0;

function selectionOdds(selection: SelectedOddType): number {
  const live = getOddsValue(
    selection.eventId,
    selection.marketId,
    Number(selection.oddsId),
  );
  return live > 0 ? live : 1;
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size <= 0 || size > items.length) return [];
  if (size === 1) return items.map((item) => [item]);

  const result: T[][] = [];
  for (let index = 0; index <= items.length - size; index += 1) {
    for (const rest of combinations(items.slice(index + 1), size - 1)) {
      result.push([items[index], ...rest]);
    }
  }
  return result;
}

export function combinationCount(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;

  let size = Math.min(k, n - k);
  let result = 1;
  for (let index = 0; index < size; index += 1) {
    result = (result * (n - index)) / (index + 1);
  }
  return Math.round(result);
}

export function getDefaultNamedSystem(selectionCount: number): NamedSystem | null {
  return NAMED_SYSTEMS[selectionCount] ?? null;
}

export function getSystemSizeTotalOdds(
  selections: SelectedOddType[],
  size: number,
): number {
  const odds = selections.map(selectionOdds);
  return combinations(odds, size).reduce(
    (sum, combo) => sum + combo.reduce((product, odd) => product * odd, 1),
    0,
  );
}

export function getSystemSizeLabel(
  size: number,
  count: number,
  t: (key: string) => string,
): string {
  if (size === 1) return `${t("systemSingles")} = ${count}`;
  if (size === 2) return `${t("systemDoubles")} = ${count}`;
  return `${t("systemFold").replace("{size}", String(size))} = ${count}`;
}

/** Human-readable label for API `systemType` (e.g. `lucky_15` → Lucky 15). */
export function formatSystemTypeLabel(systemType: string): string {
  if (!systemType) return "System";
  if (systemType.startsWith("custom_")) {
    return `Custom ${systemType.slice("custom_".length)}`;
  }
  return systemType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getNamedSystemTotals(
  selections: SelectedOddType[],
  namedSystem: NamedSystem,
): { combinationCount: number; totalOdds: number } {
  let comboCount = 0;
  let totalOdds = 0;

  for (const size of namedSystem.sizes) {
    comboCount += combinationCount(selections.length, size);
    totalOdds += getSystemSizeTotalOdds(selections, size);
  }

  return { combinationCount: comboCount, totalOdds };
}

export function buildSystemCombinationPayload(
  specifier: Record<number, number>,
  selectionCount: number,
): SystemCombinationPayload[] {
  const stakesBySize = new Map<number, number>();

  for (let size = 1; size <= selectionCount; size += 1) {
    const stake = specifier[size] ?? 0;
    if (stake > 0) stakesBySize.set(size, stake);
  }

  const namedStake = specifier[NAMED_SYSTEM_STAKE_KEY] ?? 0;
  const namedSystem = getDefaultNamedSystem(selectionCount);
  if (namedStake > 0 && namedSystem) {
    for (const size of namedSystem.sizes) {
      if (!stakesBySize.has(size)) {
        stakesBySize.set(size, namedStake);
      }
    }
  }

  return Array.from(stakesBySize.entries())
    .map(([size, stake]) => ({ size, stake }))
    .sort((a, b) => a.size - b.size);
}

export function getSystemTotalStake(
  specifier: Record<number, number>,
  selectionCount: number,
): number {
  return buildSystemCombinationPayload(specifier, selectionCount).reduce(
    (total, entry) =>
      total + entry.stake * combinationCount(selectionCount, entry.size),
    0,
  );
}
