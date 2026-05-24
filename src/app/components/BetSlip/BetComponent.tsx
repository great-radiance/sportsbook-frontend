import { FunctionComponent } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { BetItemType } from "@/shared/utils/bet";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import {
  formatCurrency,
  formatDate,
  formatTime,
} from "@/shared/utils/formatters";
import {
  selectedCashoutAmount,
  selectedCashoutBet,
  selectedCashoutBetId,
} from "@/state/betState";
import { isMobile } from "@/state/isMobile";
import { notify } from "@/shared/toast";
import { cashoutAmountForBet } from "@/api/bet/cashout";
import { loadBetDetail } from "@/api/bet/apiBetDetail";
import Loader from "../Loading/Loader";
import { useTranslate } from "@/shared/i18n/i18n";
import {
  cashoutDialogOnSuccess,
  isOpenedCashoutDialog,
} from "@/state/isOpenedCashoutDialog";
import { baseColorTheme } from "@/state/baseColorTheme";
import {
  getBetStatusLabel,
  isCashoutableStatus,
} from "@/helpers/betStatus";
import { BetHistoryLegRow } from "./BetHistoryLegRow";

interface BetComponentProps {
  bet: BetItemType;
  onCashoutSuccess?: () => void;
  isMyBet?: boolean;
  isSettledView?: boolean;
}

function shortBetId(betId: string): string {
  if (betId.length <= 8) return betId;
  return betId.slice(-8);
}

export const BetComponent: FunctionComponent<BetComponentProps> = ({
  bet,
  onCashoutSuccess,
  isMyBet,
  isSettledView = false,
}) => {
  const { t } = useTranslate("betslip");
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [detailBet, setDetailBet] = useState<BetItemType | null>(null);

  const displayBet = detailBet ?? bet;
  const status = displayBet.status;

  const currencyCode =
    typeof displayBet.metadata?.currency === "string"
      ? displayBet.metadata.currency
      : undefined;

  const fmt = (amount: number) => formatCurrency(amount, currencyCode);

  const stakeAmount = displayBet.stakeAmount;
  const startingOdds = displayBet.startingOdds;
  const availableCashout = cashoutAmountForBet(displayBet);
  const canCashoutExplicit =
    displayBet.metadata?.canCashout === false ? false : true;
  const canCashout =
    isCashoutableStatus(status) && canCashoutExplicit && availableCashout > 0;

  const legCount = useMemo(() => {
    const fromMeta = displayBet.metadata?.selectionCount;
    if (typeof fromMeta === "number" && fromMeta > 0) return fromMeta;
    return displayBet.legs.length || 1;
  }, [displayBet.legs.length, displayBet.metadata?.selectionCount]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void loadBetDetail(bet.betId).then((loaded) => {
      if (cancelled) return;
      if (loaded) setDetailBet(loaded);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [bet.betId]);

  const handleCashoutClick = () => {
    if (!isCashoutableStatus(status)) return;
    selectedCashoutBetId.value = displayBet.betId;
    selectedCashoutBet.value = displayBet;
    selectedCashoutAmount.value = availableCashout;
    cashoutDialogOnSuccess.value = onCashoutSuccess ?? null;
    isOpenedCashoutDialog.value = true;
  };

  const handleCopyBetId = async () => {
    try {
      await navigator.clipboard.writeText(displayBet.betId);
      notify("Bet ID copied to clipboard", "success", "check2-circle", 2000);
    } catch (err) {
      console.error("Failed to copy bet ID:", err);
    }
  };

  const statusLabel = getBetStatusLabel(status, t);
  const shortResult =
    typeof displayBet.metadata?.shortResult === "string"
      ? displayBet.metadata.shortResult
      : null;

  const payoutAmount = (() => {
    if (status === "cashed_out" && displayBet.cashoutAmount != null) {
      return displayBet.cashoutAmount;
    }
    if (typeof displayBet.metadata?.actualPayout === "number") {
      return displayBet.metadata.actualPayout;
    }
    if (typeof displayBet.metadata?.potentialPayout === "number") {
      return displayBet.metadata.potentialPayout;
    }
    return stakeAmount * startingOdds;
  })();

  const baseTheme = baseColorTheme.value;
  const showCashoutButton =
    !isSettledView && isCashoutableStatus(status);

  return (
    <div
      className={`flex ${isMyBet ? "" : "flex-col"} w-full bg-[var(--sub-element-secondary)] border-[1px] border-[var(--border-color)] min-h-[200px] text-[11px] text-[var(--text-basic-color)] rounded-[8px]  gap-2 p-3 overflow-hidden`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 flex items-center justify-center rounded-full border-[2px] text-[12px] border-[var(--background-element-light)]">
              {displayBet.betType === "single" ? (
                1
              ) : (
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/icons/multi.png`}
                  alt="multi"
                  className="w-4 h-4"
                />
              )}
            </div>
            <div className="flex flex-col text-[11px]">
              <div>
                {t(displayBet.betType)}
                {legCount > 1 ? ` (${legCount})` : ""}
              </div>
              <div className="flex items-center gap-1">
                <div>ID: {shortBetId(displayBet.betId)}</div>
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/icons/save.png`}
                  alt={t("copy")}
                  className="w-3 cursor-pointer"
                  onClick={handleCopyBetId}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col h-full items-end justify-center">
          <div className="text-[var(--primary-color)] uppercase">
            {shortResult || statusLabel}
          </div>
          <div>
            {formatDate(displayBet.placedAt)},{" "}
            {formatTime(new Date(displayBet.placedAt).getTime())}
          </div>
        </div>
      </div>

      <div className="w-full h-[1px] bg-[var(--border-color)]" />

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>{t("stakePlaceholder")}</div>
          <div>{fmt(stakeAmount)}</div>
        </div>
        <div className="flex items-center justify-between">
          <div>{t("oddsDecimal")}</div>
          <div className="text-[var(--primary-color)]">
            {Number(startingOdds).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="w-full h-[1px] bg-[var(--border-color)]" />

      <div className="flex items-center justify-between w-full">
        <div>
          {isSettledView || !isCashoutableStatus(status)
            ? t("result")
            : t("possibleWin")}
        </div>
        <div className="text-[var(--primary-color)]">
          {fmt(payoutAmount)}
        </div>
      </div>

      {showCashoutButton && (
        <button
          type="button"
          onClick={handleCashoutClick}
          disabled={loading || !canCashout}
          className={`relative flex items-center justify-between w-full text-black px-3 py-2 rounded-[4px] transition-opacity cursor-pointer bg-[var(--primary-color)] disabled:opacity-50 disabled:cursor-not-allowed ${!isMobile.value ? "hover:opacity-90" : ""}`}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-[4px] z-10">
              <Loader />
            </div>
          )}
          <div>{t("cashout")}</div>
          <div className="text-black">{fmt(availableCashout)}</div>
        </button>
      )}

      <div className="w-full h-[1px] bg-[var(--border-color)]" />

      <button
        type="button"
        className="flex w-full px-3 py-2 pr-2 items-center justify-between rounded-[4px] border-[var(--border-color)] border-[1px] text-[11px] transition-colors cursor-pointer bg-[var(--sub-element-color)]"
        onClick={() => setShowDetail(!showDetail)}
      >
        <div className="uppercase">{t("betDetails")}</div>
        <div className="flex items-center gap-1">
          <div>{legCount}</div>
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
            alt="arrow-right"
            className={`w-6 transition-transform duration-300 ${showDetail ? "-rotate-90" : "rotate-90"} ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
          />
        </div>
      </button>

      {showDetail &&
        displayBet.legs.map((leg, i) => (
          <BetHistoryLegRow
            key={`${leg.eventId}-${leg.isBetBuilder ? "bb" : "reg"}-${i}`}
            leg={leg}
            legIndex={i}
            betStatusLabel={statusLabel}
            t={t}
          />
        ))}
    </div>
  );
};
