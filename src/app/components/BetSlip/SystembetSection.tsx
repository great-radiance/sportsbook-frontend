import { getOddsValue } from "@/helpers/getOddsValue";
import { SelectedOddType } from "@/shared/utils/bet";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { rotateBetSlipIdempotencyKey } from "@/helpers/betIdempotency";
import { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";

export function getCombinations<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  const n = arr.length;

  // Generate all bitmasks with exactly 'size' bits set
  // Note: this approach is fine for reasonably small n (e.g. n <= 20)
  for (let mask = 0; mask < 1 << n; mask++) {
    if (countBits(mask) !== size) continue;

    const combo: T[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        combo.push(arr[i]);
      }
    }
    result.push(combo);
  }

  return result;
}

function countBits(x: number): number {
  let count = 0;
  while (x) {
    count += x & 1;
    x >>>= 1; // use unsigned shift to avoid negative values for large numbers
  }
  return count;
}

const SystemBetLineComponent = (props: {
  selections: SelectedOddType[];
  systemSpecifier: number;
}) => {
  const { systemBetSpecifier } = useSportsbookStore();
  const { selections, systemSpecifier } = props;
  const [lines, setLines] = useState<SelectedOddType[][]>([]);
  const [lineOdds, setLineOdds] = useState<number[]>([]);
  const [stake, setStake] = useState<number>(0);
  useEffect(() => {
    const combos = getCombinations(selections, systemSpecifier);
    setLineOdds(
      combos.map((line) =>
        line.reduce(
          (acc, odd) =>
            acc * getOddsValue(odd.eventId, odd.marketId, Number(odd.oddsId)),
          1,
        ),
      ),
    );
    setLines(combos);
  }, [selections, systemSpecifier]);

  useEffect(() => {
    systemBetSpecifier.value[systemSpecifier] = stake;
  }, [stake, systemSpecifier]);
  return (
    <div className="w-full flex flex-row items-center justify-center text-[12px]">
      <div className="w-full flex flex-row items-center justify-start px-1 py-1 rounded-md shadow-md bg-white/10 gap-1">
        <div className="text-white px-3 py-1 border border-1 border-white/10 rounded-md">
          {systemSpecifier}
        </div>
        <div>
          <input
            type="text"
            value={stake}
            onChange={(e) => {
              setStake(Number((e as any).target.value || "0"));
              rotateBetSlipIdempotencyKey();
            }}
            className="p-1 border border-1 border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-10 bg-white/10 text-white"
          />
        </div>
        <div className="text-white">({lines.length} bets)</div>
        <div className="text-[var(--primary-color)] font-semibold flex-1">
          {lineOdds
            .reduce((acc, odd) => acc + odd, 0)
            .toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
        </div>
        <div className="pr-2 text-[var(--primary-color)]">
          {Math.min(
            lineOdds.reduce((acc, odd) => acc + odd, 0) * stake,
            10000,
          ).toLocaleString("tr-TR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
    </div>
  );
};

export default SystemBetLineComponent;
