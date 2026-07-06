import { FunctionComponent } from "preact";
import { useMemo, useState } from "preact/hooks";
import { BetItemType } from "@/shared/utils/bet";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import {
  formatCurrency,
  formatDate,
  formatTime,
} from "@/shared/utils/formatters";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { notify } from "@/shared/toast";
import { cashoutAmountForBet } from "@/api/bet/cashout";
import { useTranslate } from "@/shared/i18n/i18n";
import { getBetStatusLabel, isCashoutableStatus } from "@/helpers/betStatus";
import {
  betBuilderSelectionCount,
  betTypeDisplayKey,
  isBetBuilderBet,
} from "@/helpers/betDisplayType";
import { BetHistoryLegRow } from "./BetHistoryLegRow";
import { printBetTicketFromUi } from "@/helpers/printBetTicketFromUi";

interface BetComponentProps {
  bet: BetItemType;
  onCashoutSuccess?: () => void;
  isMyBet?: boolean;
  isSettledView?: boolean;
  isSubBet?: boolean;
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
  isSubBet = false,
}) => {
  const {
    selectedCashoutAmount,
    selectedCashoutBet,
    selectedCashoutBetId,
    isMobile,
    cashoutDialogOnSuccess,
    isOpenedCashoutDialog,
    baseColorTheme,
  } = useSportsbookStore();
  const { t } = useTranslate("betslip");
  const [showDetail, setShowDetail] = useState(false);

  const status = bet.status;

  const currencyCode =
    typeof bet.metadata?.currency === "string"
      ? bet.metadata.currency
      : undefined;

  const fmt = (amount: number) => formatCurrency(amount, currencyCode);

  const stakeAmount = bet.stakeAmount;
  const startingOdds = bet.startingOdds;
  const availableCashout = cashoutAmountForBet(bet);
  const canCashoutExplicit =
    bet.metadata?.canCashout === false ? false : true;
  const canCashout =
    isCashoutableStatus(status) && canCashoutExplicit && availableCashout > 0;

  const isBetBuilder = isBetBuilderBet(bet);
  const betTypeLabelKey = betTypeDisplayKey(bet);

  const legCount = useMemo(() => {
    if (isBetBuilder) return betBuilderSelectionCount(bet);
    const fromMeta = bet.metadata?.selectionCount;
    if (typeof fromMeta === "number" && fromMeta > 0) return fromMeta;
    return bet.legs.length || 1;
  }, [bet, isBetBuilder]);

  const handleCashoutClick = () => {
    if (!isCashoutableStatus(status)) return;
    selectedCashoutBetId.value = bet.betId;
    selectedCashoutBet.value = bet;
    selectedCashoutAmount.value = availableCashout;
    cashoutDialogOnSuccess.value = onCashoutSuccess ?? null;
    isOpenedCashoutDialog.value = true;
  };

  const handleCopyBetId = async () => {
    try {
      await navigator.clipboard.writeText(bet.betId);
      notify("Bet ID copied to clipboard", "success", "check2-circle", 2000);
    } catch (err) {
      console.error("Failed to copy bet ID:", err);
    }
  };

  const handlePrintTicket = () => {
    void printBetTicketFromUi(bet, t);
  };

  const statusLabel = getBetStatusLabel(status, t);

  const payoutAmount = (() => {
    if (status === "cashed_out" && bet.cashoutAmount != null) {
      return bet.cashoutAmount;
    }
    if (typeof bet.metadata?.actualPayout === "number") {
      return bet.metadata.actualPayout;
    }
    if (typeof bet.metadata?.potentialPayout === "number") {
      return bet.metadata.potentialPayout;
    }
    return stakeAmount * startingOdds;
  })();

  const baseTheme = baseColorTheme.value;
  const showCashoutButton = !isSettledView && isCashoutableStatus(status);

  return (
    <div
      className={`flex ${isMyBet ? "" : "flex-col"} w-full bg-[var(--sub-element-secondary)] ${isSubBet ? "border-0 min-h-0" : "border-[1px] border-[var(--border-color)] min-h-[200px]"} text-[11px] text-[var(--text-basic-color)] rounded-[8px]  gap-2 p-3 overflow-hidden`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 flex items-center justify-center rounded-full border-[2px] text-[12px] border-[var(--background-element-light)]">
              {isBetBuilder ? (
                <span className="text-[9px] font-bold leading-none">
                  {t("betBuilderShortLabel")}
                </span>
              ) : bet.betType === "single" ? (
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
                {t(betTypeLabelKey)}
                {legCount > 1 ? ` (${legCount})` : ""}
              </div>
              <div className="flex items-center gap-1">
                <div>ID: {shortBetId(bet.betId)}</div>
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
            {statusLabel}
          </div>
          <div>
            {formatDate(bet.placedAt)},{" "}
            {formatTime(new Date(bet.placedAt).getTime())}
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
        <div className="text-[var(--primary-color)]">{fmt(payoutAmount)}</div>
      </div>

      {showCashoutButton && (
        <button
          type="button"
          onClick={handleCashoutClick}
          disabled={!canCashout}
          className={`relative flex items-center justify-between w-full text-black px-3 py-2 rounded-[4px] transition-opacity cursor-pointer bg-[var(--primary-color)] disabled:opacity-50 disabled:cursor-not-allowed ${!isMobile.value ? "hover:opacity-90" : ""}`}
        >
          <div>{t("cashout")}</div>
          <div className="text-black">{fmt(availableCashout)}</div>
        </button>
      )}

      {!isSubBet && (
        <button
          type="button"
          onClick={handlePrintTicket}
          className={`flex w-full items-center justify-center px-3 py-2 rounded-[4px] border-[var(--border-color)] border-[1px] text-[11px] uppercase transition-colors cursor-pointer bg-[var(--sub-element-color)] ${!isMobile.value ? "hover:bg-[var(--sub-element-secondary)]" : ""}`}
        >
          {t("printTicket")}
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
        bet.legs.map((leg, i) => (
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
