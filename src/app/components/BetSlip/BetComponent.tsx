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

interface BetComponentProps {
  bet: BetItemType;
  onCashoutSuccess?: () => void;
  isMyBet?: boolean;
}

export const BetComponent: FunctionComponent<BetComponentProps> = ({
  bet,
  onCashoutSuccess,
  isMyBet,
}) => {
  const { t } = useTranslate("betslip");
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [detailBet, setDetailBet] = useState<BetItemType | null>(null);

  const displayBet = detailBet ?? bet;
  const status = displayBet.status;

  const selectedOddsByLeg = useMemo(() => {
    return displayBet.legs.map(
      (leg) => leg.odds.find((o) => o.selected) ?? leg.odds[0] ?? null,
    );
  }, [displayBet.legs]);

  const stakeAmount = displayBet.stakeAmount;
  const startingOdds = displayBet.startingOdds;
  const availableCashout = cashoutAmountForBet(displayBet);
  const canCashoutExplicit =
    displayBet.metadata?.canCashout === false ? false : true;
  const canCashout =
    isCashoutableStatus(status) && canCashoutExplicit && availableCashout > 0;

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
  const baseTheme = baseColorTheme.value;

  return (
    <div
      className={`flex ${isMyBet ? "" : "flex-col"} w-full bg-[var(--sub-element-secondary)] border-[1px] border-[var(--border-color)] min-h-[200px] text-[11px] text-[var(--text-basic-color)] rounded-[8px]  gap-2 p-3 overflow-hidden`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center rounded-full border-[2px] text-[12px] border-[var(--background-element-light)]">
              {displayBet.betType === "single" ? (
                1
              ) : (
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/icons/multi.png`}
                  alt="multi"
                  className="w-4 h-4"
                />
              )}
            </span>
            <div className="flex flex-col text-[11px]">
              <span>{t(displayBet.betType)}</span>
              <div className="flex items-center gap-1">
                <span>
                  ID: {displayBet.betId.split("_")[1] || displayBet.betId}
                </span>
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
          <span className="text-[var(--primary-color)] uppercase">
            {statusLabel}
          </span>
          <span>
            {formatDate(displayBet.placedAt)},{" "}
            {formatTime(new Date(displayBet.placedAt).getTime())}
          </span>
        </div>
      </div>

      <div className="w-full h-[1px] bg-[var(--border-color)]" />

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span>{t("stakePlaceholder")}</span>
          <span>{formatCurrency(stakeAmount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>{t("oddsDecimal")}</span>
          <span className="text-[var(--primary-color)]">
            {Number(startingOdds).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="w-full h-[1px] bg-[var(--border-color)]" />

      <div className="flex items-center justify-between w-full">
        <span>{t("possibleWin")}</span>
        <span className="text-[var(--primary-color)]">
          {formatCurrency(stakeAmount * startingOdds)}
        </span>
      </div>

      {isCashoutableStatus(status) && (
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
          <span>{t("cashout")}</span>
          <span className="text-black">{formatCurrency(availableCashout)}</span>
        </button>
      )}

      {!isCashoutableStatus(status) && (
        <div className="flex items-center justify-between w-full bg-white/10 px-3 py-2 rounded-[4px]">
          <span>{t("cashout")}</span>
          <span>{formatCurrency(0)}</span>
        </div>
      )}

      <div className="w-full h-[1px] bg-[var(--border-color)]" />

      <button
        type="button"
        className="flex w-full px-3 py-2 pr-2 items-center justify-between rounded-[4px] border-[var(--border-color)] border-[1px] text-[11px] transition-colors cursor-pointer bg-[var(--sub-element-color)]"
        onClick={() => setShowDetail(!showDetail)}
      >
        <span className="uppercase">{t("betDetails")}</span>
        <span className="flex items-center gap-1">
          <span>{displayBet.legs.length || 1}</span>
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
            alt="arrow-right"
            className={`w-6 transition-transform duration-300 ${showDetail ? "-rotate-90" : "rotate-90"} ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
          />
        </span>
      </button>

      {showDetail &&
        displayBet.legs.map((leg, i) => (
          <div
            key={`${leg.eventId}-${i}`}
            className="flex w-full items-start justify-between gap-2 border-[1px] border-[var(--border-color)] bg-[var(--sub-element-color)] p-2"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-[4px] pr-1 text-left">
              <span className="break-words text-[11px] leading-snug">
                {formatDate(displayBet.placedAt)},{" "}
                {formatTime(new Date(displayBet.placedAt).getTime())}
              </span>
              <span className="break-words text-[11px] leading-snug">
                {leg.league.name || ""}
              </span>
              <div className="flex min-w-0 items-start gap-1">
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/sportsicons/${leg.sport.name}.png`}
                  alt="sport"
                  className="mt-0.5 h-4 w-4 shrink-0 brightness-0 invert"
                />
                <span className="min-w-0 break-words text-[11px] leading-snug">
                  {leg.participants[0]?.name ||
                    leg.participants[0]?.providerName ||
                    ""}{" "}
                  -{" "}
                  {leg.participants[1]?.name ||
                    leg.participants[1]?.providerName ||
                    ""}
                </span>
              </div>
              <span className="break-words text-[11px] leading-snug text-[var(--primary-color)]">
                {statusLabel}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-end gap-[4px] pl-1 text-right">
              <span className="line-clamp-3 w-full max-w-full break-words text-right text-[11px] leading-snug">
                {leg.market.name || ""}
              </span>
              <span className="line-clamp-3 w-full max-w-full break-words text-right text-[11px] leading-snug">
                {selectedOddsByLeg[i]?.name}
              </span>
              <span className="w-full shrink-0 whitespace-normal break-words text-[11px] leading-snug">
                {t("startOdds")}: {selectedOddsByLeg[i]?.value}
              </span>
              <span className="w-full shrink-0 whitespace-normal break-words text-[11px] leading-snug text-[var(--primary-color)]">
                {t("currentOdds")}: {selectedOddsByLeg[i]?.currentValue}
              </span>
            </div>
          </div>
        ))}
    </div>
  );
};
