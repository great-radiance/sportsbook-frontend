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
  isRepeatConfirmOpen,
  selectedCashoutBetId,
  selectedCashoutOffer,
  selectedRepeatBet,
} from "@/state/betState";
import { isMobile } from "@/state/isMobile";
import { notify } from "@/shared/toast";
import { getCashoutOffer } from "@/api/bet/cashout";
import Loader from "../Loading/Loader";
import { useTranslate } from "@/shared/i18n/i18n";
import { cashOutOfferState } from "@/state/betHistoryState";
import { loadedAllMatches } from "@/state/loadedAllMatches";
import {
  cashoutDialogOnSuccess,
  isOpenedCashoutDialog,
} from "@/state/isOpenedCashoutDialog";
import { baseColorTheme } from "@/state/baseColorTheme";

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
  const [loading, setLoading] = useState<boolean>(true);
  const [showDetail, setShowDetail] = useState<boolean>(false);

  const selectedOddsByLeg = useMemo(() => {
    return bet.legs.map((leg) => leg.odds.find((o) => o.selected) ?? null);
  }, [bet.legs]);

  const baseTheme = baseColorTheme.value;
  const fetchCashoutOffer = async () => {
    try {
      if (cashOutOfferState.value[bet.betId]) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const offer = await getCashoutOffer(bet.betId);
      if (offer) {
        cashOutOfferState.value[bet.betId] = offer;
      } else {
        // notify("Failed to fetch cashout offer", "error", "x-circle", 2500);
      }
    } catch (error) {
      console.error("Error fetching cashout offer:", error);
      // notify("Error fetching cashout offer", "error", "x-circle", 2500);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // if (!loadedAllMatches.value) return;
    fetchCashoutOffer();
  }, [bet.betId, loadedAllMatches.value]);

  const handleCashoutClick = () => {
    if (bet.status === "pending" || bet.status === "partially_cashed_out") {
      // Open global cash-out dialog (MainLayout `CashoutDialog`)
      selectedCashoutBetId.value = bet.betId;
      selectedCashoutOffer.value = cashOutOfferState.value[bet.betId] ?? null;
      cashoutDialogOnSuccess.value = onCashoutSuccess ?? null;
      isOpenedCashoutDialog.value = true;
    }
  };

  const handleRepeatBet = async () => {
    selectedRepeatBet.value = bet;
    isRepeatConfirmOpen.value = true;
  };

  const handleEditBet = () => {};

  const handleCopyBetId = async () => {
    try {
      await navigator.clipboard.writeText(bet.betId);
      notify("Bet ID copied to clipboard", "success", "check2-circle", 2000);
      // You can add a toast notification here if needed
    } catch (err) {
      console.error("Failed to copy bet ID:", err);
    }
  };

  const getStatusIcon = () => {
    switch (bet.status) {
      case "won":
        return (
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/won.png`}
            alt="won"
            className="w-4 h-4"
          />
        );
      case "lost":
        return (
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/lost.png`}
            alt="lost"
            className="w-4 h-4"
          />
        );
      case "cashed_out":
      case "partially_cashed_out":
        return (
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/cashed-out.png`}
            alt="cashed_out"
            className="w-4 h-4"
          />
        );
      default:
        return (
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/pending.png`}
            alt="pending"
            className="w-4 h-4"
          />
        );
    }
  };

  const getStatusColor = () => {
    switch (bet.status) {
      case "won":
      case "cashed_out":
      case "partially_cashed_out":
        return "text-green-400";
      case "lost":
        return "text-red-400";
      default:
        return "text-[var(--primary-color)]";
    }
  };

  const getStatusText = () => {
    switch (bet.status) {
      case "won":
        return t("won");
      case "lost":
        return t("lost");
      case "cashed_out":
        return t("cashedOut");
      case "partially_cashed_out":
        return t("partiallyCashedOut");
      case "pending":
        return t("pending");
      default:
        return bet.status.charAt(0).toUpperCase() + bet.status.slice(1);
    }
  };

  const getOutcomeText = () => {
    if (bet.status === "pending" || bet.status === "unsettled") {
      return {
        label: t("possibleWin"),
        amount: bet.stakeAmount * bet.startingOdds,
      };
    } else if (bet.status === "won") {
      return {
        label: t("outcome"),
        amount: bet.stakeAmount * bet.startingOdds, // or bet.outcomeAmount if available
      };
    } else if (bet.status === "lost") {
      return {
        label: t("outcome"),
        amount: 0,
      };
    } else if (
      bet.status === "cashed_out" ||
      bet.status === "partially_cashed_out"
    ) {
      return {
        label: t("cashedOut"),
        amount: bet.cashoutAmount ?? 0,
      };
    }
    return {
      label: t("outcome"),
      amount: 0,
    };
  };

  const getTypeIcon = () => {
    switch (bet.betType) {
      case "single":
        return 1;
      case "multi":
        return (
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/multi.png`}
            alt="multi"
            className="w-4 h-4"
          />
        );
      case "system":
        return (
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/multi.png`}
            alt="multi"
            className="w-4 h-4"
          />
        );
      case "betbuilder":
        return (
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/multi.png`}
            alt="multi"
            className="w-4 h-4"
          />
        );
      default:
        return 1;
    }
  };

  return (
    <>
      <div
        className={`flex ${isMyBet ? "" : "flex-col"} w-full bg-[var(--sub-element-secondary)] border-[1px] border-[var(--border-color)] min-h-[200px] text-[11px] text-[var(--text-basic-color)] rounded-[8px]  gap-2 p-3 overflow-hidden`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center rounded-full border-[2px] text-[12px] border-[var(--background-element-light)]">
                {getTypeIcon()}
              </span>
              <div className="flex flex-col text-[11px]">
                <span>{t(bet.betType)}</span>
                <div className="flex items-center gap-1">
                  <span>ID: {bet.betId.split("_")[1] || bet.betId}</span>
                  <img
                    src={`${BASE_ASSET_PUBLIC_URL}/icons/save.png`}
                    alt={t("copy")}
                    className="w-3"
                    onClick={handleCopyBetId}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col h-full items-end justify-center">
            <span className="text-[var(--primary-color)] uppercase">
              {getStatusText()}
            </span>
            <span>
              {formatDate(bet.placedAt)},{" "}
              {formatTime(new Date(bet.placedAt).getTime())}
            </span>
          </div>
        </div>
        {/* divider */}
        <div className="w-full h-[1px] bg-[var(--border-color)]" />
        {/* bet legs */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span>{t("stakePlaceholder")}</span>
            <span>
              {formatCurrency(
                cashOutOfferState.value[bet.betId]?.betHistory?.stakeAmount ??
                  0,
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t("oddsDecimal")}</span>
            <span className="text-[var(--primary-color)]">
              {Number(
                cashOutOfferState.value[bet.betId]?.betHistory?.startingOdds ??
                  0,
              ).toFixed(2)}
            </span>
          </div>
        </div>
        <div className="w-full h-[1px] bg-[var(--border-color)]" />
        <div className="flex items-center justify-between w-full">
          <span>{t("possibleWin")}</span>
          <span className="text-[var(--primary-color)]">
            {formatCurrency(
              cashOutOfferState.value[bet.betId]?.betHistory?.stakeAmount *
                cashOutOfferState.value[bet.betId]?.betHistory?.startingOdds ||
                0,
            )}
          </span>
        </div>
        {(bet.status === "pending" ||
          bet.status === "partially_cashed_out") && (
          <>
            <button
              onClick={handleCashoutClick}
              disabled={
                loading ||
                !cashOutOfferState.value[bet.betId]?.canCashout ||
                cashOutOfferState.value[bet.betId]?.availableCashout === 0
              }
              className={`relative flex items-center justify-between w-full text-black px-3 py-2 rounded-[4px] transition-opacity cursor-pointer bg-[var(--primary-color)] disabled:opacity-50 disabled:cursor-not-allowed ${!isMobile.value ? "hover:opacity-90" : ""}`}
            >
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-[4px] z-10">
                  <Loader />
                </div>
              )}
              <span>{t("cashout")}</span>
              <span className="text-black">
                {formatCurrency(
                  cashOutOfferState.value[bet.betId]?.availableCashout ?? 0,
                )}
              </span>
            </button>
          </>
        )}
        {bet.status !== "pending" && bet.status !== "partially_cashed_out" && (
          <div className="flex items-center justify-between w-full bg-white/10 px-3 py-2 rounded-[4px]">
            <span>{t("cashout")}</span>
            <span className="">
              {formatCurrency(
                cashOutOfferState.value[bet.betId]?.availableCashout ?? 0,
              )}
            </span>
          </div>
        )}
        <div className="w-full h-[1px] bg-[var(--border-color)]" />
        <button
          className="flex w-full px-3 py-2 pr-2 items-center justify-between rounded-[4px] border-[var(--border-color)] border-[1px] text-[11px] transition-colors cursor-pointer bg-[var(--sub-element-color)]"
          onClick={() => setShowDetail(!showDetail)}
        >
          <span className="uppercase">{t("betDetails")}</span>
          <span className="flex items-center gap-1">
            <span>{bet.legs.length || 1}</span>
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
              alt="arrow-right"
              className={`w-6 transition-transform duration-300 ${showDetail ? "-rotate-90" : "rotate-90"} ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
            />
          </span>
        </button>
        {showDetail &&
          bet.legs.map((leg, i) => (
            <div className="flex w-full items-start justify-between gap-2 border-[1px] border-[var(--border-color)] bg-[var(--sub-element-color)] p-2">
              <div className="flex min-w-0 flex-1 flex-col gap-[4px] pr-1 text-left">
                <span className="break-words text-[11px] leading-snug">
                  {formatDate(bet.placedAt)},{" "}
                  {formatTime(new Date(bet.placedAt).getTime())}
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
                  {bet.status.replace("_", " ")}
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
        {/* <div className="w-full h-[1px] bg-[var(--border-color)]" /> */}
        {/* <div className="flex gap-3 items-center w-full">
          <span
            className={`flex items-center justify-center w-6 h-6 rounded-[4px] cursor-pointer bg-white/10 ${!isMobile.value ? "hover:bg-white/20" : ""}`}
            onClick={handleRepeatBet}
          >
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/icons/repeat.png`}
              alt="repeat"
              className="w-4"
            />
          </span>
          <span
            className={`flex items-center justify-center w-6 h-6 rounded-[4px] cursor-pointer bg-white/10 ${!isMobile.value ? "hover:bg-white/20" : ""}`}
            onClick={handleEditBet}
          >
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/icons/edit.png`}
              alt="edit"
              className="w-4"
            />
          </span>
        </div> */}
      </div>
    </>
  );
};
