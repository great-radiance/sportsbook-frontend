import { FunctionComponent } from "preact";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { formatCurrency } from "@/shared/utils/formatters";

export const PlayerExposureBar: FunctionComponent = () => {
  const { playerExposure, playerLimits } = useSportsbookStore();
  const exposure = playerExposure.value;
  const limits = playerLimits.value;
  if (!exposure || !limits) return null;

  const maxDaily =
    limits.single?.maxDailyStake ?? limits.parlay?.maxDailyStake ?? 0;
  if (!maxDaily || maxDaily <= 0) return null;

  const used = exposure.dailyStakeTotal ?? 0;
  const pct = Math.min(100, Math.round((used / maxDaily) * 100));

  return (
    <div className="px-3 py-2 text-[11px] text-[var(--text-sub-color)] border-t border-[var(--border-color)]">
      <div className="flex justify-between mb-1">
        <span>Daily stake</span>
        <span>
          {formatCurrency(used)} / {formatCurrency(maxDaily)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct >= 90 ? "bg-[var(--text-red)]" : "bg-[var(--primary-color)]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
