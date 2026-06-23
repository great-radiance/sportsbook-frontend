/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useMemo, useState } from "preact/hooks";
import type { BetItemType, SystemCombinationDisplay } from "@/shared/utils/bet";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import {
  formatCurrency,
  formatDate,
  formatTime,
} from "@/shared/utils/formatters";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { useTranslate } from "@/shared/i18n/i18n";
import { getBetStatusLabel } from "@/helpers/betStatus";
import {
  formatSystemTypeLabel,
  getSystemSizeLabel,
} from "@/helpers/systemBet";
import { BetComponent } from "./BetComponent";

interface SystemBetGroupComponentProps {
  bet: BetItemType;
  onCashoutSuccess?: () => void;
  isSettledView?: boolean;
}

function shortBetId(betId: string): string {
  if (betId.length <= 8) return betId;
  return betId.slice(-8);
}

export const SystemBetGroupComponent: FunctionComponent<
  SystemBetGroupComponentProps
> = ({ bet, onCashoutSuccess, isSettledView = false }) => {
  const { t } = useTranslate("betslip");
  const { baseColorTheme } = useSportsbookStore();
  const [showDetail, setShowDetail] = useState(false);

  const currencyCode =
    typeof bet.metadata?.currency === "string"
      ? bet.metadata.currency
      : undefined;
  const fmt = (amount: number) => formatCurrency(amount, currencyCode);

  const statusLabel = getBetStatusLabel(bet.status, t);
  const systemLabel = formatSystemTypeLabel(bet.systemType);
  const combinationCount =
    typeof bet.metadata?.combinationCount === "number"
      ? bet.metadata.combinationCount
      : (bet.subBets?.length ?? 0);
  const totalSelections =
    typeof bet.metadata?.totalSelections === "number"
      ? bet.metadata.totalSelections
      : 0;

  const systemCombinations = useMemo(() => {
    const raw = bet.metadata?.systemCombinations;
    return Array.isArray(raw) ? (raw as SystemCombinationDisplay[]) : [];
  }, [bet.metadata?.systemCombinations]);

  const baseTheme = baseColorTheme.value;
  const subBets = bet.subBets ?? [];

  return (
    <div className="flex w-full min-h-[200px] flex-col gap-2 overflow-hidden rounded-[8px] border border-[var(--border-color)] bg-[var(--sub-element-secondary)] p-3 text-[11px] text-[var(--text-basic-color)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--background-element-light)] text-[12px]">
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/icons/multi.png`}
              alt="system"
              className="h-4 w-4"
            />
          </div>
          <div className="flex flex-col text-[11px]">
            <div>
              {t("system")} ({systemLabel})
              {totalSelections > 0 ? ` · ${totalSelections}` : ""}
            </div>
            <div>ID: {shortBetId(bet.betId)}</div>
          </div>
        </div>
        <div className="flex h-full flex-col items-end justify-center">
          <div className="uppercase text-[var(--primary-color)]">
            {statusLabel}
          </div>
          <div>
            {formatDate(bet.placedAt)},{" "}
            {formatTime(new Date(bet.placedAt).getTime())}
          </div>
        </div>
      </div>

      <div className="h-[1px] w-full bg-[var(--border-color)]" />

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>{t("stakePlaceholder")}</div>
          <div>{fmt(bet.stakeAmount)}</div>
        </div>
        <div className="flex items-center justify-between">
          <div>{t("systemCombinations")}</div>
          <div>{combinationCount}</div>
        </div>
      </div>

      {systemCombinations.length > 0 && (
        <>
          <div className="h-[1px] w-full bg-[var(--border-color)]" />
          <div className="flex flex-col gap-1">
            {systemCombinations.map((combo) => (
              <div
                key={combo.size}
                className="flex items-center justify-between text-[10px] text-[var(--text-sub-color)]"
              >
                <span>{getSystemSizeLabel(combo.size, combo.count, t)}</span>
                <span>{fmt(combo.stake)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="h-[1px] w-full bg-[var(--border-color)]" />

      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between rounded-[4px] border border-[var(--border-color)] bg-[var(--sub-element-color)] px-3 py-2 pr-2 text-[11px] transition-colors"
        onClick={() => setShowDetail(!showDetail)}
      >
        <div className="uppercase">{t("betDetails")}</div>
        <div className="flex items-center gap-1">
          <div>{subBets.length}</div>
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
            alt="arrow-right"
            className={`h-6 w-6 transition-transform duration-300 ${showDetail ? "-rotate-90" : "rotate-90"} ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
          />
        </div>
      </button>

      {showDetail && (
        <div className="flex flex-col gap-2 pt-1">
          {subBets.map((subBet) => (
            <div
              key={subBet.betId}
              className="overflow-hidden rounded-[6px] border border-[var(--border-color)]/60"
            >
              <BetComponent
                bet={subBet}
                onCashoutSuccess={onCashoutSuccess}
                isSettledView={isSettledView}
                isSubBet
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
