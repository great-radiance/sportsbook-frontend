/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import {
  sportsbookStore,
  useSportsbookStore,
} from "@/state/sportsbookStoreContext";
import "@shoelace-style/shoelace/dist/components/select/select.js";
import "@shoelace-style/shoelace/dist/components/option/option.js";
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";
import "@shoelace-style/shoelace/dist/themes/dark.css"; // or light.css
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { SelectedOddType } from "@/shared/utils/bet";
import { notify } from "@/shared/toast";
import Loader from "../Loading/Loader";
import { getAppConfig } from "@/shared/config/appConfig";
import { betSlipExpanded } from "@/shared/utils/BetSlipExpanded";
import { SelectedOddComponent } from "./SelectedOddComponent";
import { useTranslate } from "@/shared/i18n/i18n";
import { apiPlaceBetWithRetry } from "@/api/bet/placeBet";
import { showAcceptedBetInOpenBets } from "@/helpers/showAcceptedBetInOpenBets";
import { requestBetHistoryRefresh } from "@/state/sportsbookStoreHelpers";
import {
  currentBetSlipIdempotencyKey,
  rotateBetSlipIdempotencyKey,
} from "@/helpers/betIdempotency";
import { useEnableBetType } from "@/hooks/useEnableBetType";
import { useSlipBetBuilderPricesSync } from "@/hooks/useSlipBetBuilderPrices";
import { canPlayerPlaceBets, playerStatusMessage } from "@/api/user/apiUsersMe";
import {
  maxParlayLegsFromLimits,
  stakeLimitsForBetType,
  validateStakeAmount,
} from "@/helpers/betLimits";
import { Switch } from "../Switch";
import { selectionStoreKey } from "@/state/sportsbookStoreContext";
import { getOddsValue } from "@/helpers/getOddsValue";
import SystemBetLineComponent from "./SystembetSection";
import { refreshAfterWalletAction } from "@/helpers/refreshPlayerWallet";
import {
  handleOddsChangedRejection,
  onBetRejectedWithReason,
  type SubmittedSelectionLine,
} from "@/helpers/betRejection";
import {
  allBetBuilderLegsCombinable,
  betBuilderLegRejectMessage,
  buildPlaceBetDescription,
  buildPlaceBetDescriptionForLeg,
  buildPlaceBetSelections,
  combinedLegOdds,
  groupSelectedOddsIntoLegs,
  legOdds,
  selectionsForLeg,
  slipLegCount,
} from "@/helpers/betslipLegs";
import { BetBuilderGroupComponent } from "./BetBuilderGroupComponent";

function extractAxiosMessage(err: unknown): string {
  const e = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return (
    e?.response?.data?.message || e?.message || "Bet request failed. Try again."
  );
}

function toSubmittedLines(odds: SelectedOddType[]): SubmittedSelectionLine[] {
  const legs = groupSelectedOddsIntoLegs(odds);
  const bbPrices = currentBbPriceMap();
  return legs.flatMap((leg) => {
    if (leg.type === "betbuilder") {
      const first = leg.selections[0];
      return [
        {
          label: `Bet Builder — ${leg.eventName}`,
          eventId: leg.eventId,
          marketId: first.apiMarketId,
          selectionId: first.apiSelectionId,
          odds: legOdds(leg, bbPrices),
        },
      ];
    }
    const s = leg.selection;
    return [
      {
        label: `${s.name} — ${s.marketName}`,
        eventId: s.eventId,
        marketId: s.apiMarketId,
        selectionId: s.apiSelectionId,
        odds: getOddsValue(s.eventId, s.marketId, Number(s.oddsId)) ?? 1,
      },
    ];
  });
}

function currentBbPriceMap(): Record<number, number | null> {
  return Object.fromEntries(
    Object.entries(sportsbookStore.betBuilderPricesByEvent.value).map(
      ([eventId, state]) => [Number(eventId), state.price],
    ),
  );
}

function notifyBetRejected(
  code: string | undefined,
  submitted?: SubmittedSelectionLine[],
  betId?: string,
): void {
  onBetRejectedWithReason(code);
  notify(rejectionReasonMessage(code), "error", "x-circle", 3500);
  if (code === "DUPLICATE_BET" && betId) {
    requestBetHistoryRefresh();
  }
  if (code === "ODDS_CHANGED" && submitted?.length) {
    void handleOddsChangedRejection(submitted);
  }
}

function handleProviderRegistrationFailure(): void {
  notify(
    "Bet placed — cashout may be unavailable. Contact support if needed.",
    "warning",
    "exclamation-triangle",
    5000,
  );
  rotateBetSlipIdempotencyKey();
}

function rejectionReasonMessage(code: string | undefined): string {
  if (!code) return "Bet was rejected.";
  const map: Record<string, string> = {
    USER_SUSPENDED: "Your account is currently suspended.",
    SELECTION_CLOSED: "This market is no longer available.",
    ODDS_CHANGED: "Odds have changed — please review and resubmit.",
    STAKE_BELOW_MIN: "Stake is below the minimum allowed.",
    STAKE_ABOVE_MAX: "Stake exceeds the maximum allowed.",
    PAYOUT_ABOVE_MAX: "Potential payout exceeds the maximum.",
    DAILY_STAKE_EXCEEDED: "Daily stake limit reached.",
    DAILY_PAYOUT_EXCEEDED: "Daily payout limit reached.",
    MAX_EXPOSURE_EXCEEDED: "Betting is temporarily unavailable.",
    WALLET_RESERVE_FAILED: "Insufficient funds or wallet error.",
    DUPLICATE_BET: "This bet was already submitted.",
  };
  return map[code] || code;
}

function slipSelectionsPayload(odds: SelectedOddType[]) {
  const legs = groupSelectedOddsIntoLegs(odds);
  return buildPlaceBetSelections(legs, currentBbPriceMap());
}

export const BetSlip: FunctionComponent = () => {
  const {
    selectedOdds,
    multipleBetAmount,
    selectedBetType,
    systemBetSpecifier,
    balance,
    currency,
    selectedBetslipTab,
    betBuilderPricesByEvent,
    playerProfile,
    playerLimits,
    betSlipWarning,
    isMobile,
    baseColorTheme,
  } = useSportsbookStore();
  const { t } = useTranslate("betslip");
  useSlipBetBuilderPricesSync();
  const [isChanged, setIsChanged] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [betable, setBetable] = useState(false);
  const config = getAppConfig();
  const { xUserId, currency: userCurrency } = config;
  const maxParlayLegs = maxParlayLegsFromLimits(playerLimits.value);
  const singleStakeLimits = stakeLimitsForBetType(playerLimits.value, "single");
  const parlayStakeLimits = stakeLimitsForBetType(playerLimits.value, "parlay");
  const accountStatusMessage = playerProfile.value
    ? playerStatusMessage(playerProfile.value.status)
    : null;
  const slipLegs = groupSelectedOddsIntoLegs(selectedOdds.value);
  const slipLegTotal = slipLegCount(selectedOdds.value);
  const betBuilderWarning = betBuilderLegRejectMessage(
    slipLegs,
    betBuilderPricesByEvent.value,
  );
  const inlineBetslipWarning =
    betSlipWarning.value ?? betBuilderWarning;
  const regularSlipOdds = slipLegs
    .filter((leg) => leg.type === "regular")
    .map((leg) => (leg.type === "regular" ? leg.selection : null))
    .filter((sel): sel is SelectedOddType => sel != null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevExpandedRef = useRef(betSlipExpanded.value);

  const isExpanded = betSlipExpanded.value && selectedOdds.value.length > 0;
  /** Collapsed mobile: floating round bet slip (FAB), not the full-width bar */
  const isMobileFabCollapsed =
    isMobile.value && !isExpanded && selectedOdds.value.length > 0;
  const showContent = isExpanded || isCollapsing;

  const fabTotalOdds = combinedLegOdds(slipLegs, currentBbPriceMap());
  const { multiBetEnabled, systemBetEnabled } = useEnableBetType();
  const [anyOddsChange, setAnyOddsChange] = useState(false);
  const [settedMulti, setSettedMulti] = useState(false);
  const baseTheme = baseColorTheme.value;

  // bet type tabs definition (used for rendering tablist)
  const betTypeTabs = [
    { value: "single", label: t("single"), enabled: true },
    { value: "multi", label: t("multiple"), enabled: multiBetEnabled },
    { value: "system", label: t("system"), enabled: systemBetEnabled },
  ];

  const toggleBetSlipExpanded = () => {
    if (selectedOdds.value.length === 0) return;
    betSlipExpanded.value = !betSlipExpanded.value;
  };

  useEffect(() => {
    const wasExpanded = prevExpandedRef.current;
    prevExpandedRef.current = isExpanded;
    if (wasExpanded && !isExpanded) {
      setIsCollapsing(true);
      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = setTimeout(() => {
        setIsCollapsing(false);
        collapseTimeoutRef.current = null;
      }, 300);
    } else if (isExpanded) {
      if (collapseTimeoutRef.current) {
        clearTimeout(collapseTimeoutRef.current);
        collapseTimeoutRef.current = null;
      }
      setIsCollapsing(false);
    }
    return () => {
      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    };
  }, [isExpanded]);

  useEffect(() => {
    if (
      selectedBetType.value === "single" &&
      !settedMulti &&
      slipLegTotal > 1 &&
      multiBetEnabled
    ) {
      selectedBetType.value = "multi";
      setSettedMulti(true);
    } else if (settedMulti && slipLegTotal < 2) {
      selectedBetType.value = "single";
      setSettedMulti(false);
    }
  }, [selectedOdds.value, settedMulti, slipLegTotal, multiBetEnabled]);

  useEffect(() => {
    const haveUser = Boolean(config.xUserId);
    const profileOk =
      !playerProfile.value || canPlayerPlaceBets(playerProfile.value.status);
    const funds =
      (balance.value > 0 ? balance.value : 0) ||
      (config.xUserBalance ?? 0) ||
      0;

    if (
      selectedOdds.value.length === 0 ||
      !haveUser ||
      !profileOk ||
      funds <= 0
    ) {
      setBetable(false);
      return;
    }

    const bbCombinable = allBetBuilderLegsCombinable(
      slipLegs,
      betBuilderPricesByEvent.value,
    );
    const bbLoading = slipLegs.some(
      (leg) =>
        leg.type === "betbuilder" &&
        leg.selections.length >= 2 &&
        betBuilderPricesByEvent.value[leg.eventId]?.loading,
    );
    if (bbLoading || !bbCombinable) {
      setBetable(false);
      return;
    }

    if (selectedBetType.value === "multi" && slipLegTotal > maxParlayLegs) {
      setBetable(false);
      return;
    }

    // Check bet amounts based on bet type
    if (selectedBetType.value === "single") {
      const allAmountsValid = slipLegs.every((leg) => {
        if (leg.type === "betbuilder") {
          return (leg.selections[0]?.amount ?? 0) > 0;
        }
        return leg.selection.amount > 0;
      });
      if (!allAmountsValid) {
        setBetable(false);
        return;
      }
    } else {
      // For multi bets: multipleBetAmount must be > 0
      if (
        selectedBetType.value === "multi" &&
        (!multipleBetAmount.value || multipleBetAmount.value <= 0)
      ) {
        setBetable(false);
        return;
      }
      const multiCombined = combinedLegOdds(slipLegs, currentBbPriceMap());
      if (
        selectedBetType.value === "multi" &&
        validateStakeAmount(
          multipleBetAmount.value,
          playerLimits.value,
          "parlay",
          undefined,
          multiCombined,
        )
      ) {
        setBetable(false);
        return;
      }
    }

    setBetable(true);
  }, [
    selectedOdds.value,
    balance.value,
    config.xUserBalance,
    playerProfile.value,
    betBuilderPricesByEvent.value,
    config.xUserId,
    selectedBetType.value,
    multipleBetAmount.value,
    slipLegTotal,
    maxParlayLegs,
    playerLimits.value,
    slipLegs,
  ]);

  const combinedMultipleOddsLabel = betBuilderWarning
    ? "—"
    : combinedLegOdds(slipLegs, currentBbPriceMap()).toFixed(2);

  const RemoveAllBets = () => {
    selectedOdds.value = [];
    selectedBetType.value = "single";
    multipleBetAmount.value = 0;
    betSlipWarning.value = null;
    window.localStorage.removeItem("selectedOdds");
    rotateBetSlipIdempotencyKey();
  };

  const handleBetNow = async () => {
    const failedBets = new Set<SelectedOddType>();
    setIsLoading(true);
    try {
      if (!betable) {
        if (inlineBetslipWarning) return;
        notify(
          "Please check your betslip and try again",
          "error",
          "x-circle",
          2500,
        );
        return;
      }

      const cur = userCurrency || currency.value || "USD";
      const legs = groupSelectedOddsIntoLegs(selectedOdds.value);
      const bbReject = betBuilderLegRejectMessage(
        legs,
        betBuilderPricesByEvent.value,
      );
      if (bbReject) {
        betSlipWarning.value = bbReject;
        return;
      }

      if (selectedBetType.value === "single") {
        for (const leg of legs) {
          const stake =
            leg.type === "betbuilder"
              ? (leg.selections[0]?.amount ?? 0)
              : leg.selection.amount;
          const legCombinedOdds = legOdds(leg, currentBbPriceMap());
          const stakeErr = validateStakeAmount(
            stake,
            playerLimits.value,
            "single",
            cur,
            legCombinedOdds,
          );
          if (stakeErr) {
            notify(stakeErr, "error", "x-circle", 3500);
            selectionsForLeg(leg).forEach((o) => failedBets.add(o));
            continue;
          }
          try {
            const call = await apiPlaceBetWithRetry({
              idempotencyKey: currentBetSlipIdempotencyKey(),
              betType: "single",
              stake,
              currency: cur,
              selections: buildPlaceBetSelections([leg], currentBbPriceMap()),
              description: buildPlaceBetDescriptionForLeg(leg),
            });
            if (call.providerRegistrationFailed || call.httpStatus === 502) {
              handleProviderRegistrationFailure();
              continue;
            }
            const d = call.result;
            if (d?.status === "rejected") {
              notifyBetRejected(
                d.rejectionReason,
                toSubmittedLines(selectionsForLeg(leg)),
                d.betId,
              );
              selectionsForLeg(leg).forEach((o) => failedBets.add(o));
              rotateBetSlipIdempotencyKey();
            } else if (d?.status === "accepted") {
              notify("Bet accepted", "success", "check2-circle", 2500);
              void refreshAfterWalletAction();
              void showAcceptedBetInOpenBets(d.betId);
              rotateBetSlipIdempotencyKey();
            } else {
              notify("Unexpected bet response", "error", "x-circle", 2500);
              selectionsForLeg(leg).forEach((o) => failedBets.add(o));
            }
          } catch (error) {
            notify(extractAxiosMessage(error), "error", "x-circle", 3500);
            selectionsForLeg(leg).forEach((o) => failedBets.add(o));
          }
        }
      } else if (selectedBetType.value === "multi") {
        const combinedOdds = combinedLegOdds(legs, currentBbPriceMap());
        const multiStakeErr = validateStakeAmount(
          multipleBetAmount.value,
          playerLimits.value,
          "parlay",
          cur,
          combinedOdds,
        );
        if (multiStakeErr) {
          notify(multiStakeErr, "error", "x-circle", 3500);
          return;
        }
        try {
          const call = await apiPlaceBetWithRetry({
            idempotencyKey: currentBetSlipIdempotencyKey(),
            betType: legs.length === 1 ? "single" : "parlay",
            stake: multipleBetAmount.value,
            currency: cur,
            selections: buildPlaceBetSelections(legs, currentBbPriceMap()),
            description: buildPlaceBetDescription(selectedOdds.value),
          });
          if (call.providerRegistrationFailed || call.httpStatus === 502) {
            handleProviderRegistrationFailure();
            selectedOdds.value = [];
            return;
          }
          if (call.httpStatus === 409 && call.result?.betId) {
            await showAcceptedBetInOpenBets(call.result.betId);
            notify(
              "This bet was already submitted.",
              "primary",
              "info-circle",
              3500,
            );
            selectedOdds.value = [];
            window.localStorage.removeItem("selectedOdds");
            rotateBetSlipIdempotencyKey();
            return;
          }
          const d = call.result;
          if (d?.status === "rejected") {
            notifyBetRejected(
              d.rejectionReason,
              toSubmittedLines(selectedOdds.value),
              d.betId,
            );
            selectedOdds.value.forEach((o) => failedBets.add(o));
            rotateBetSlipIdempotencyKey();
          } else if (d?.status === "accepted") {
            selectedOdds.value = [];
            window.localStorage.removeItem("selectedOdds");
            notify("Bet accepted", "success", "check2-circle", 2500);
            void refreshAfterWalletAction();
            void showAcceptedBetInOpenBets(d.betId);
            rotateBetSlipIdempotencyKey();
          } else {
            notify("Unexpected bet response", "error", "x-circle", 2500);
            selectedOdds.value.forEach((o) => failedBets.add(o));
          }
        } catch (error) {
          notify(extractAxiosMessage(error), "error", "x-circle", 3500);
          selectedOdds.value.forEach((o) => failedBets.add(o));
        }
      } else if (selectedBetType.value === "system") {
        await Promise.all(
          [...Array(Math.min(regularSlipOdds.length, 5))].map((_, index) => {
            const stake = systemBetSpecifier.value[index + 1] || 0;
            if (stake === 0) return Promise.resolve();
            return (async () => {
              try {
                const call = await apiPlaceBetWithRetry({
                  idempotencyKey: currentBetSlipIdempotencyKey(),
                  betType: "system",
                  stake,
                  currency: cur,
                  selections: slipSelectionsPayload(regularSlipOdds),
                  systemMinCombination: index + 1,
                  description: buildPlaceBetDescription(regularSlipOdds),
                });
                if (
                  call.providerRegistrationFailed ||
                  call.httpStatus === 502
                ) {
                  handleProviderRegistrationFailure();
                  return;
                }
                const d = call.result;
                if (d?.status === "rejected") {
                  notifyBetRejected(
                    d.rejectionReason,
                    toSubmittedLines(regularSlipOdds),
                    d.betId,
                  );
                  regularSlipOdds.forEach((o) => failedBets.add(o));
                  rotateBetSlipIdempotencyKey();
                } else if (d?.status === "accepted") {
                  selectedOdds.value = [];
                  window.localStorage.removeItem("selectedOdds");
                  notify("Bet accepted", "success", "check2-circle", 2500);
                  void refreshAfterWalletAction();
                  void showAcceptedBetInOpenBets(d.betId);
                  rotateBetSlipIdempotencyKey();
                } else {
                  notify("Unexpected bet response", "error", "x-circle", 2500);
                  regularSlipOdds.forEach((o) => failedBets.add(o));
                }
              } catch (error) {
                notify(extractAxiosMessage(error), "error", "x-circle", 3500);
                regularSlipOdds.forEach((o) => failedBets.add(o));
              }
            })();
          }),
        );
      }

      if (failedBets.size > 0) {
        selectedOdds.value = Array.from(failedBets);
        window.localStorage.setItem(
          "selectedOdds",
          JSON.stringify(Array.from(failedBets)),
        );
      } else {
        selectedOdds.value = [];
        window.localStorage.removeItem("selectedOdds");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOdds.value.length === 0) {
      setIsChanged(false);
      return;
    }
    if (!isChanged) {
      betSlipExpanded.value = true;
      setIsChanged(true);
    }
  }, [selectedOdds.value.length, isChanged]);

  const handleDragStart = (clientY: number) => {
    isDraggingRef.current = true;
    dragStartYRef.current = clientY;
  };

  const handleDragMove = (clientY: number) => {
    if (!isDraggingRef.current) return;

    const deltaY = clientY - dragStartYRef.current;
    // Only collapse if dragging down (positive deltaY) and threshold is met
    if (deltaY > 80) {
      betSlipExpanded.value = false;
      setIsChanged(true);
      isDraggingRef.current = false;
    }
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    dragStartYRef.current = 0;
  };

  // Touch event handlers
  const handleTouchStart = (e: TouchEvent) => {
    if (!betSlipExpanded.value) return;
    handleDragStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDraggingRef.current) return;
    // Prevent scrolling while dragging
    if (e.touches[0].clientY > dragStartYRef.current) {
      e.preventDefault();
    }
    handleDragMove(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse event handlers
  const handleMouseDown = (e: MouseEvent) => {
    if (!betSlipExpanded.value) return;
    e.preventDefault();
    handleDragStart(e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    handleDragMove(e.clientY);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  // Add global event listeners for drag
  useEffect(() => {
    if (!isMobile.value || !betSlipExpanded.value) return;

    const dragHandle = dragHandleRef.current;
    if (!dragHandle) return;

    // Touch events (passive: false to allow preventDefault)
    dragHandle.addEventListener("touchstart", handleTouchStart as any, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove as any, {
      passive: false,
    });
    document.addEventListener("touchend", handleTouchEnd);

    // Mouse events
    dragHandle.addEventListener("mousedown", handleMouseDown as any);
    document.addEventListener("mousemove", handleMouseMove as any);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      dragHandle.removeEventListener("touchstart", handleTouchStart as any);
      document.removeEventListener("touchmove", handleTouchMove as any);
      document.removeEventListener("touchend", handleTouchEnd);
      dragHandle.removeEventListener("mousedown", handleMouseDown as any);
      document.removeEventListener("mousemove", handleMouseMove as any);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isMobile.value, betSlipExpanded.value]);

  if (selectedOdds.value.length === 0) return null;

  return (
    <>
      <div
        className={`flex flex-col ${isMobileFabCollapsed
            ? "max-h-none w-auto max-w-none ml-auto items-end bg-transparent shadow-none p-0 mr-3"
            : `max-h-[calc(100vh-200px)] mb-2 w-full bg-[var(--sub-element-color)] shadow-[-8px_-8px_4px_rgba(0,0,0,0.15)] ${isExpanded
              ? "rounded-t-[32px] border border-[var(--border-color)]"
              : "rounded-[32px] border border-[var(--border-color)]"
            }`
          } ${isMobileFabCollapsed ? "overflow-visible" : "overflow-hidden"} text-[var(--text-basic-color)] relative ${betSlipExpanded.value ? "z-[50]" : "z-45"
          }`}
      >
        {/* Header — full bar (desktop / mobile expanded) or floating FAB (mobile collapsed) */}
        {selectedOdds.value.length > 0 &&
          (isMobileFabCollapsed ? (
            <button
              type="button"
              className="relative flex h-[72px] w-[72px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-full bg-[var(--primary-color)] text-[var(--text-basic-color)] shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition-transform active:scale-95"
              onClick={toggleBetSlipExpanded}
              aria-label={t("betSlip")}
            >
              <span className="text-[15px] font-bold leading-none tabular-nums">
                {fabTotalOdds.toFixed(2)}
              </span>
              <span className="absolute -right-0.5 -top-0.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[var(--background-element)] px-[5px] text-[11px] font-bold leading-none text-[var(--text-basic-color)]">
                {selectedOdds.value.length}
              </span>
            </button>
          ) : (
            <div
              className="flex w-full bg-[var(--primary-color)] items-center justify-between px-6 py-3 cursor-pointer"
              onClick={toggleBetSlipExpanded}
            >
              <div className="relative flex items-center h-full">
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/bet.png`}
                  alt="Bet Slip"
                  className="w-8 h-8"
                />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--sub-element-color)] text-[10px] flex items-center justify-center text-[var(--text-basic-color)] font-bold">
                  {selectedOdds.value.length}
                </span>
                {/* <span className="w-5 h-5 text-[10px] flex items-center justify-center text-[var(--text-basic-color)] font-bold">
                {fabTotalOdds.toFixed(2)}
              </span> */}
              </div>
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                alt="Toggle"
                className={`w-6 h-6 ${isExpanded ? "rotate-90" : "-rotate-90"}`}
              />
            </div>
          ))}

        {/* Expandable content */}
        <div
          className={`grid min-h-0 transition-[grid-template-rows] bg-[var(--sub-element-color)] duration-300 ease-in-out ${
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          {/* IMPORTANT: min-h-0 so children can shrink and overflow can scroll */}
          <div className="min-h-0 overflow-hidden flex flex-col">
            {/* Bet slip view */}
            {showContent && selectedBetslipTab.value === "bet-slip" && (
              <div className="flex w-full min-h-0 flex-1 flex-col overflow-hidden p-2">
                {accountStatusMessage && (
                  <div className="mb-2 rounded-[8px] border border-[var(--border-color)] bg-[var(--sub-element-secondary)] px-3 py-2 text-[11px] leading-snug text-[var(--text-sub-color)]">
                    {accountStatusMessage}
                  </div>
                )}
                <div className="flex rounded-b-[4px] p-2 gap-2 justify-center items-center animate-[fade-in_0.3s_ease-out]">
                  <div className="flex flex-1 gap-2 items-center ">
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/trash.png`}
                      alt="remove all"
                      className={`w-4 h-4 ${baseTheme === "dark" ? "brightness-0 invert" : ""} cursor-pointer`}
                      onClick={() => RemoveAllBets()}
                    />
                    <div className="w-[1px] h-6 bg-[var(--primary-border-color)]" />
                    <span className="text-[14px] font-bold">
                      {t("betSlip")}
                    </span>
                    <span className="px-1 py-[2px] rounded-full border-[2px] cursor-default border-[var(--primary-border-color)] text-[10px] font-bold ml-2">
                      {slipLegTotal}/{maxParlayLegs}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    {/* <img
                      src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/share.png`}
                      alt="share"
                      className="w-4 h-4 brightness-0 invert"
                    />
                    <div className="w-[1px] h-6 bg-[var(--primary-border-color)]" /> */}
                    {/* <img
                      src={`${BASE_ASSET_PUBLIC_URL}/icons/settings.png`}
                      alt="settings"
                      className="w-4 h-4 brightness-0 invert cursor-pointer"
                      onClick={() => setIsOpenedSettings(!isOpenedSettings)}
                    /> */}
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px]">
                          {t("accept-of-odds-changes")}
                        </span>
                        <sl-tooltip
                          content={t("accept-of-odds-changes-info")}
                          placement="bottom"
                          className="inline-block"
                        >
                          <img
                            src={`${BASE_ASSET_PUBLIC_URL}/icons/info.png`}
                            alt="info"
                            className={`w-3 h-3 ${baseTheme === "dark" ? "brightness-0 invert" : ""} cursor-help`}
                          />
                        </sl-tooltip>
                      </div>
                      <Switch
                        checked={anyOddsChange}
                        onChange={(checked: boolean) =>
                          setAnyOddsChange(checked)
                        }
                        className="bg-[#C2CEE5]"
                      />
                    </div>
                  </div>
                </div>

                {/* <div
                  className={
                    "flex flex-col text-[var(--text-sub-color)] p-2 m-2 rounded-[8px] overflow-hidden border-[1px] gap-2 bg-[var(--sub-element-secondary)] transition-all duration-300 ease-in-out"
                    // (isOpenedSettings
                    //   ? " max-h-[420px] opacity-100 translate-y-0 block m-2 p-2"
                    //   : " max-h-0 opacity-0 -translate-y-2 pointer-events-none none")
                  }
                >
                  <span className="font-bold text-[12px]">
                    {t("acceptance-of-odds-changes")}
                  </span>

                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px]">
                        {t("any-odds-change")}
                      </span>
                      <img
                        src={`${BASE_ASSET_PUBLIC_URL}/icons/info.png`}
                        alt="info"
                        className="w-3 h-3 brightness-0 invert"
                      />
                    </div>
                    <Switch
                      checked={anyOddsChange}
                      onChange={(checked: boolean) => setAnyOddsChange(checked)}
                      className="bg-[#C2CEE5]"
                    />
                  </div>

                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px]">{t("higher-odds")}</span>
                      <img
                        src={`${BASE_ASSET_PUBLIC_URL}/icons/info.png`}
                        alt="info"
                        className="w-3 h-3 brightness-0 invert"
                      />
                    </div>
                    <Switch
                      checked={higherOdds}
                      onChange={(checked: boolean) => setHigherOdds(checked)}
                      className="bg-[var(--border-color)]"
                    />
                  </div>
                </div> */}

                <nav
                  role="tablist"
                  aria-label="Bet types"
                  className="mb-2 flex items-center rounded-full border border-[var(--border-color)] bg-[var(--background-element)] p-1"
                >
                  {betTypeTabs.map((tab) => (
                    <button
                      key={tab.value}
                      role="tab"
                      aria-selected={selectedBetType.value === tab.value}
                      onClick={() =>
                        tab.enabled &&
                        (selectedBetType.value = tab.value as any)
                      }
                      disabled={!tab.enabled}
                      className={`flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium ${
                        selectedBetType.value === tab.value
                          ? "bg-[var(--sub-element-secondary)] shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                          : "opacity-80"
                      } ${!tab.enabled ? "cursor-not-allowed opacity-35" : ""}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>

                {inlineBetslipWarning && selectedOdds.value.length > 0 && (
                  <div className="mb-2 rounded-[8px] border border-[#ff7a1a] px-3 py-2 text-[12px] leading-snug text-[#ff7a1a]">
                    {inlineBetslipWarning}
                  </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  {selectedOdds.value.length === 0 ? (
                    <div className="flex min-h-[114px] items-center justify-center">
                      <span className="text-[12px] font-normal">{t("empty")}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {slipLegs.map((leg, index) =>
                        leg.type === "betbuilder" ? (
                          <BetBuilderGroupComponent
                            key={`bb-${leg.eventId}`}
                            leg={leg}
                            forceUpdate={forceUpdate}
                            selectedBetType={
                              selectedBetType.value as
                                | "single"
                                | "multi"
                                | "system"
                            }
                            setForceUpdate={setForceUpdate}
                            minStake={singleStakeLimits.minStake}
                            maxStake={singleStakeLimits.maxStake}
                          />
                        ) : (
                          <SelectedOddComponent
                            key={selectionStoreKey(
                              leg.selection.eventId,
                              leg.selection.marketId,
                              Number(leg.selection.oddsId),
                            )}
                            bet={leg.selection}
                            index={index}
                            forceUpdate={forceUpdate}
                            selectedBetType={
                              selectedBetType.value as
                                | "single"
                                | "multi"
                                | "system"
                            }
                            setForceUpdate={setForceUpdate}
                            minStake={singleStakeLimits.minStake}
                            maxStake={singleStakeLimits.maxStake}
                          />
                        ),
                      )}

                      {selectedBetType.value === "multi" && slipLegTotal > 1 && (
                        <div className="rounded-[12px] border border-[var(--border-color)] bg-[var(--sub-element-secondary)] p-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[14px] font-semibold">
                                {slipLegTotal}-{t("foldEqualsOne")}
                              </div>
                              <div className="text-[18px] text-[13px] font-bold">
                                {combinedMultipleOddsLabel}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                key={`multiple-${forceUpdate}`}
                                type="number"
                                inputMode="numeric"
                                min={parlayStakeLimits.minStake}
                                max={parlayStakeLimits.maxStake}
                                value={multipleBetAmount.value.toString() || ""}
                                onInput={(e) => {
                                  const value = (e.target as HTMLInputElement).value;
                                  multipleBetAmount.value = parseFloat(value) || 0;
                                  rotateBetSlipIdempotencyKey();
                                }}
                                className="h-10 w-[92px] rounded-[9px] border border-[var(--border-color)] bg-[var(--background-element)] px-2 text-[13px] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                className="h-10 rounded-[9px] border border-[var(--border-color)] bg-[var(--background-element)] px-3 text-[13px] font-semibold"
                                onClick={() => {
                                  multipleBetAmount.value =
                                    parlayStakeLimits.maxStake ?? 0;
                                  rotateBetSlipIdempotencyKey();
                                }}
                              >
                                MAX
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedBetType.value === "system" && (
                        <div className="rounded-[12px] border border-[var(--border-color)] bg-[var(--sub-element-secondary)] p-2">
                          <div className="mb-1 text-[13px] font-semibold">{t("system")}</div>
                          {[...Array(Math.min(regularSlipOdds.length, 5))].map((_, i) => (
                            <SystemBetLineComponent
                              key={i}
                              selections={regularSlipOdds}
                              systemSpecifier={i + 1}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {xUserId === "" && (
                  <div className="mt-2 rounded-[8px] bg-[#AA7F0033] px-3 py-2 text-[11px]">
                    To place your bet, please sign in or register.
                  </div>
                )}

                <div className="relative mt-2 rounded-[8px] border border-[var(--border-color)] bg-[var(--sub-element-secondary)] p-2">
                  {isLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[8px] bg-[var(--sub-element-secondary)]">
                      <Loader />
                    </div>
                  )}
                  <div className="mb-2 flex items-center justify-between text-[13px]">
                    <span className="text-[var(--text-sub-color)]">Bets</span>
                    <span className="font-semibold">{slipLegTotal}</span>
                  </div>
                  <button
                    onClick={handleBetNow}
                    disabled={isLoading || !betable}
                    className="h-[40px] w-full rounded-[9px] bg-[var(--primary-color)] text-[13px] font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("betNow")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
