/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import {
  selectedOdds,
  multipleBetAmount,
  selectedBetType,
  isBonusInfoOpen,
  buildingBetAmount,
  systemBetSpecifier,
  balance,
  currency,
  selectedBetslipTab,
  betBuilderCombinable,
  betBuilderPrice,
  betBuilderRejectMessage,
  betBuilderPriceLoading,
  playerProfile,
  playerLimits,
} from "@/state/betState";
import "@shoelace-style/shoelace/dist/components/select/select.js";
import "@shoelace-style/shoelace/dist/components/option/option.js";
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";
import "@shoelace-style/shoelace/dist/themes/dark.css"; // or light.css
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { SelectedOddType } from "@/shared/utils/bet";
import { notify } from "@/shared/toast";
import { isMobile } from "@/state/isMobile";
import Loader from "../Loading/Loader";
import { getAppConfig } from "@/shared/config/appConfig";
import { betSlipExpanded } from "@/shared/utils/BetSlipExpanded";
import { SelectedOddComponent } from "./SelectedOddComponent";
import { useTranslate } from "@/shared/i18n/i18n";
import { formatCurrency } from "@/shared/utils/formatters";
import { apiPlaceBetWithRetry } from "@/api/bet/placeBet";
import { useEnableBetType } from "@/hooks/useEnableBetType";
import { useBetBuilderPriceSync } from "@/hooks/useBetBuilderPrice";
import {
  canPlayerPlaceBets,
  playerStatusMessage,
} from "@/api/user/apiUsersMe";
import { apiCashoutSubscribe } from "@/api/bet/cashout";
import {
  maxParlayLegsFromLimits,
  stakeLimitsForBetType,
  validateStakeAmount,
} from "@/helpers/betLimits";
import { Switch } from "../Switch";
import { storeState } from "@/state/storeState";
import { getOddsValue } from "@/helpers/getOddsValue";
import { computed } from "@preact/signals";
import SystemBetLineComponent from "./SystembetSection";
import { baseColorTheme } from "@/state/baseColorTheme";

function extractAxiosMessage(err: unknown): string {
  const e = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return (
    e?.response?.data?.message || e?.message || "Bet request failed. Try again."
  );
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
  return odds.map((odd) => ({
    eventId: odd.eventId,
    marketId: odd.apiMarketId ?? Number(odd.marketId),
    selectionId: odd.apiSelectionId ?? Number(odd.oddsId),
    odds: getOddsValue(odd.eventId, odd.marketId, odd.oddsId),
  }));
}

/** Balance is from the operator wallet (integration guide) — refresh from init config only. */
function refreshBalanceFromConfig() {
  const cfg = getAppConfig();
  if (typeof cfg.xUserBalance === "number") balance.value = cfg.xUserBalance;
  if (cfg.currency) currency.value = cfg.currency;
}

async function subscribeCashoutForBet(betId: string, playerId?: string) {
  const pid = playerId || getAppConfig().xUserId;
  if (!pid || !betId) return;
  try {
    await apiCashoutSubscribe(betId, pid);
  } catch {
    /* non-blocking — cashout feed is best-effort */
  }
}

export const BetSlip: FunctionComponent = () => {
  const { t } = useTranslate("betslip");
  useBetBuilderPriceSync();
  const [selectedValue, setSelectedValue] = useState("always-ask");
  const [isChanged, setIsChanged] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [quickAmounts, setQuickAmounts] = useState([50, 100, 500]);
  const firstInputRef = useRef<HTMLInputElement>(null);
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
  const [buildingOdds, setBuildingOdds] = useState<SelectedOddType[]>([]);
  const [nonBuildingOdds, setNonBuildingOdds] = useState<SelectedOddType[]>([]);
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

  const fabTotalOdds = (() => {
    const list = selectedOdds.value;
    const building = list.filter((b) => b.isBuilding);
    const nonBuilding = list.filter((b) => !b.isBuilding);
    const product = (bets: typeof list) =>
      bets.reduce(
        (acc, bet) =>
          acc * (getOddsValue(bet.eventId, bet.marketId, bet.oddsId) ?? 1),
        1,
      );
    if (building.length > 0) return product(building);
    if (nonBuilding.length > 0) return product(nonBuilding);
    return 1;
  })();
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
    const building = selectedOdds.value.filter((bet) => bet.isBuilding);
    const nonBuilding = selectedOdds.value.filter((bet) => !bet.isBuilding);
    setBuildingOdds(building);
    setNonBuildingOdds(nonBuilding);
    if (
      selectedBetType.value === "single" &&
      !settedMulti &&
      nonBuilding.length > 1 &&
      multiBetEnabled
    ) {
      selectedBetType.value = "multi";
      setSettedMulti(true);
    } else if (settedMulti && nonBuilding.length < 2) {
      selectedBetType.value = "single";
      setSettedMulti(false);
    }
  }, [selectedOdds.value, settedMulti, multipleBetAmount.value]);

  useEffect(() => {
    const haveUser = Boolean(config.xUserId);
    const profileOk =
      !playerProfile.value || canPlayerPlaceBets(playerProfile.value.status);
    const funds =
      (balance.value > 0 ? balance.value : 0) ||
      (config.xUserBalance ?? 0) ||
      0;

    if (selectedOdds.value.length === 0 || !haveUser || !profileOk || funds <= 0) {
      setBetable(false);
      return;
    }
    if (buildingOdds.length > 0) {
      if (
        buildingBetAmount.value === 0 ||
        buildingOdds.length < 2 ||
        betBuilderPriceLoading.value ||
        !betBuilderCombinable.value
      ) {
        setBetable(false);
        return;
      }
    }

    if (nonBuildingOdds.length === 0) {
      setBetable(true);
      return;
    }

    if (
      selectedBetType.value === "multi" &&
      nonBuildingOdds.length > maxParlayLegs
    ) {
      setBetable(false);
      return;
    }

    // Check bet amounts based on bet type
    if (selectedBetType.value === "single") {
      // For single bets: all bets must have a valid amount > 0
      const allAmountsValid = selectedOdds.value.every(
        (bet) => bet.amount && bet.amount > 0,
      );
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
    }

    setBetable(true);
  }, [
    selectedOdds.value,
    balance.value,
    config.xUserBalance,
    playerProfile.value,
    betBuilderCombinable.value,
    betBuilderPriceLoading.value,
    config.xUserId,
    selectedBetType.value,
    multipleBetAmount.value,
    buildingBetAmount.value,
    buildingOdds.length,
    maxParlayLegs,
    playerLimits.value,
  ]);

  const combinedMultipleOdds = computed(() =>
    nonBuildingOdds.length > 0
      ? nonBuildingOdds.reduce((acc, bet) => {
          // const odd = storeState.value[bet.eventId].value?.markets[bet.marketId]
          //   ?.odds[bet.oddsId] as tOdd;
          return (
            acc * (getOddsValue(bet.eventId, bet.marketId, bet.oddsId) ?? 1)
          );
        }, 1)
      : 1,
  );
  const combinedBuildingOdds = computed(() => {
    if (
      betBuilderCombinable.value &&
      typeof betBuilderPrice.value === "number" &&
      betBuilderPrice.value > 1
    ) {
      return betBuilderPrice.value;
    }
    if (buildingOdds.length > 0) {
      return buildingOdds.reduce(
        (acc, bet) =>
          acc * (getOddsValue(bet.eventId, bet.marketId, bet.oddsId) ?? 1),
        1,
      );
    }
    return 1;
  });

  const handleQuickAmountClick = (amount: number) => {
    if (selectedBetType.value === "single") {
      // Set amount for all single bets
      selectedOdds.value.forEach((bet) => {
        bet.amount = amount;
      });
      // Force re-render to update input values
      selectedOdds.value = [...selectedOdds.value];
      setForceUpdate((prev) => prev + 1);
    } else {
      // Set amount for multiple bet
      multipleBetAmount.value = amount;
      setForceUpdate((prev) => prev + 1);
    }
  };

  const RemoveAllBets = () => {
    selectedOdds.value = [];
    selectedBetType.value = "single";
    multipleBetAmount.value = 0;
    window.localStorage.removeItem("selectedOdds");
  };

  const handleBetNow = async () => {
    const failedBets = new Set<SelectedOddType>();
    setIsLoading(true);
    try {
      if (!betable) {
        notify(
          "Please check your betslip and try again",
          "error",
          "x-circle",
          2500,
        );
        return;
      }

      const cur = userCurrency || currency.value || "USD";

      const buildingStakeErr = validateStakeAmount(
        buildingBetAmount.value,
        playerLimits.value,
        "parlay",
        cur,
      );
      if (buildingOdds.length > 0 && buildingStakeErr) {
        notify(buildingStakeErr, "error", "x-circle", 3500);
        return;
      }

      if (buildingOdds.length > 0 && buildingBetAmount.value > 0) {
        if (!betBuilderCombinable.value) {
          notify(
            betBuilderRejectMessage.value ||
              "These selections cannot be combined",
            "error",
            "x-circle",
            3500,
          );
          return;
        }
        try {
          const d = await apiPlaceBetWithRetry({
            idempotencyKey: crypto.randomUUID(),
            betType: "parlay",
            stake: buildingBetAmount.value,
            currency: cur,
            selections: slipSelectionsPayload(buildingOdds),
          });
          if (d?.status === "rejected") {
            notify(
              rejectionReasonMessage(
                (d as { rejectionReason?: string }).rejectionReason,
              ),
              "error",
              "x-circle",
              3500,
            );
            buildingOdds.forEach((o) => failedBets.add(o));
          } else if (d?.status === "accepted") {
            selectedOdds.value = selectedOdds.value.filter((o) => !o.isBuilding);
            setBuildingOdds([]);
            buildingBetAmount.value = 0;
            notify("Bet accepted", "success", "check2-circle", 2500);
            refreshBalanceFromConfig();
            void subscribeCashoutForBet(d.betId, xUserId);
          } else {
            notify("Unexpected bet response", "error", "x-circle", 2500);
            buildingOdds.forEach((o) => failedBets.add(o));
          }
        } catch (error) {
          notify(extractAxiosMessage(error), "error", "x-circle", 3500);
          buildingOdds.forEach((o) => failedBets.add(o));
        }
      }

      if (nonBuildingOdds.length > 0 && selectedBetType.value === "single") {
        for (const odd of nonBuildingOdds) {
          const stakeErr = validateStakeAmount(
            odd.amount,
            playerLimits.value,
            "single",
            cur,
          );
          if (stakeErr) {
            notify(stakeErr, "error", "x-circle", 3500);
            failedBets.add(odd);
            continue;
          }
          try {
            const d = await apiPlaceBetWithRetry({
              idempotencyKey: crypto.randomUUID(),
              betType: "single",
              stake: odd.amount,
              currency: cur,
              selections: slipSelectionsPayload([odd]),
            });
            if (d?.status === "rejected") {
              notify(
                rejectionReasonMessage(
                  (d as { rejectionReason?: string }).rejectionReason,
                ),
                "error",
                "x-circle",
                3500,
              );
              failedBets.add(odd);
            } else if (d?.status === "accepted") {
              notify("Bet accepted", "success", "check2-circle", 2500);
              refreshBalanceFromConfig();
              void subscribeCashoutForBet(d.betId, xUserId);
            } else {
              notify("Unexpected bet response", "error", "x-circle", 2500);
              failedBets.add(odd);
            }
          } catch (error) {
            notify(extractAxiosMessage(error), "error", "x-circle", 3500);
            failedBets.add(odd);
          }
        }
      } else if (
        nonBuildingOdds.length > 0 &&
        selectedBetType.value === "multi"
      ) {
        const multiStakeErr = validateStakeAmount(
          multipleBetAmount.value,
          playerLimits.value,
          "parlay",
          cur,
        );
        if (multiStakeErr) {
          notify(multiStakeErr, "error", "x-circle", 3500);
          return;
        }
        try {
          const d = await apiPlaceBetWithRetry({
            idempotencyKey: crypto.randomUUID(),
            betType: "parlay",
            stake: multipleBetAmount.value,
            currency: cur,
            selections: slipSelectionsPayload(nonBuildingOdds),
          });
          if (d?.status === "rejected") {
            notify(
              rejectionReasonMessage(
                (d as { rejectionReason?: string }).rejectionReason,
              ),
              "error",
              "x-circle",
              3500,
            );
            nonBuildingOdds.forEach((o) => failedBets.add(o));
          } else if (d?.status === "accepted") {
            selectedOdds.value = [];
            window.localStorage.removeItem("selectedOdds");
            notify("Bet accepted", "success", "check2-circle", 2500);
            refreshBalanceFromConfig();
            void subscribeCashoutForBet(d.betId, xUserId);
          } else {
            notify("Unexpected bet response", "error", "x-circle", 2500);
            nonBuildingOdds.forEach((o) => failedBets.add(o));
          }
        } catch (error) {
          notify(extractAxiosMessage(error), "error", "x-circle", 3500);
          nonBuildingOdds.forEach((o) => failedBets.add(o));
        }
      } else if (selectedBetType.value === "system") {
        await Promise.all(
          [...Array(Math.min(nonBuildingOdds.length, 5))].map((_, index) => {
            const stake = systemBetSpecifier.value[index + 1] || 0;
            if (stake === 0) return Promise.resolve();
            return (async () => {
              try {
                const d = await apiPlaceBetWithRetry({
                  idempotencyKey: crypto.randomUUID(),
                  betType: "parlay",
                  stake,
                  currency: cur,
                  selections: slipSelectionsPayload(nonBuildingOdds),
                });
                if (d?.status === "rejected") {
                  notify(
                    rejectionReasonMessage(
                      (d as { rejectionReason?: string }).rejectionReason,
                    ),
                    "error",
                    "x-circle",
                    3500,
                  );
                  nonBuildingOdds.forEach((o) => failedBets.add(o));
                } else if (d?.status === "accepted") {
                  selectedOdds.value = [];
                  window.localStorage.removeItem("selectedOdds");
                  notify("Bet accepted", "success", "check2-circle", 2500);
                  refreshBalanceFromConfig();
                  void subscribeCashoutForBet(d.betId, xUserId);
                } else {
                  notify("Unexpected bet response", "error", "x-circle", 2500);
                  nonBuildingOdds.forEach((o) => failedBets.add(o));
                }
              } catch (error) {
                notify(extractAxiosMessage(error), "error", "x-circle", 3500);
                nonBuildingOdds.forEach((o) => failedBets.add(o));
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
      return;
    }
  }, [selectedOdds.value.length, betSlipExpanded.value]);

  useEffect(() => {
    if (isEditMode && firstInputRef.current) {
      firstInputRef.current.focus();
      firstInputRef.current.select();
    }
  }, [isEditMode]);

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
        className={`flex flex-col ${
          isMobileFabCollapsed
            ? "max-h-none w-auto max-w-none ml-auto items-end bg-transparent border-0 shadow-none p-0 mr-3"
            : `max-h-[calc(100vh-200px)] mb-2 w-full bg-[var(--sub-element-color)] shadow-[-8px_-8px_4px_rgba(0,0,0,0.15)] ${
                isExpanded
                  ? "rounded-t-[32px]"
                  : "rounded-[32px] border border-[var(--border-color)]"
              }`
        } ${isMobileFabCollapsed ? "overflow-visible" : "overflow-hidden"} text-[var(--text-basic-color)] relative ${
          betSlipExpanded.value ? "z-[50]" : "z-45"
        }`}
      >
        {/* Header — full bar (desktop / mobile expanded) or floating FAB (mobile collapsed) */}
        {selectedOdds.value.length > 0 &&
          (isMobileFabCollapsed ? (
            <button
              type="button"
              className="relative flex h-[72px] w-[72px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-full bg-[var(--primary-color)] text-[var(--text-basic-color)] shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition-transform active:scale-95"
              onClick={() => {
                if (selectedOdds.value.length > 0) {
                  betSlipExpanded.value = !betSlipExpanded.value;
                }
              }}
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
              onClick={() => {
                if (selectedOdds.value.length > 0) {
                  betSlipExpanded.value = !betSlipExpanded.value;
                }
              }}
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
              <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">
                {accountStatusMessage && (
                  <div className="mx-2 mt-2 rounded-[8px] border border-[var(--border-color)] bg-[var(--sub-element-secondary)] px-3 py-2 text-[11px] leading-snug text-[var(--text-sub-color)]">
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
                      {selectedOdds.value.length}/{maxParlayLegs}
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

                <div className="w-full flex px-2 items-center justify-between">
                  {/* Tablist for bet types */}
                  <nav
                    role="tablist"
                    aria-label="Bet types"
                    className="flex w-full items-center bg-[var(--sub-element-secondary)] border border-[var(--border-color)] rounded-[4px] justify-between px-4 gap-2"
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
                        className={`px-4 py-2 text-[12px] ${
                          selectedBetType.value === tab.value
                            ? "border-b-[2px] border-[var(--primary-color)]"
                            : ""
                        } ${!tab.enabled ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* ✅ THIS is the scroll area. Needs ancestors with min-h-0 + container height */}
                <div className="w-full flex flex-col flex-1 min-h-0 overflow-y-auto gap-[2px]">
                  <div className="w-full flex items-center justify-center">
                    {selectedOdds.value.length === 0 ? (
                      <div className="w-full min-h-[114px] flex items-center justify-center">
                        <span className="text-[12px] font-normal ">
                          {t("empty")}
                        </span>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col gap-[2px] px-2">
                        <div className="w-full flex flex-col gap-[2px] transition-[opacity,transform] duration-300 ease-in-out">
                          {buildingOdds.map((bet, index) => (
                            <SelectedOddComponent
                              key={bet.oddsId}
                              bet={bet}
                              index={index}
                              forceUpdate={forceUpdate}
                              selectedBetType={
                                selectedBetType.value as "single" | "multi"
                              }
                              setForceUpdate={setForceUpdate}
                            />
                          ))}
                        </div>

                        {buildingOdds.length > 0 && (
                          <>
                            <div className="w-full flex items-center justify-between px-2 py-2">
                              <span className=" text-[12px] font-normal">
                                {t("betbuilderOdds")}
                              </span>
                              <span className="text-[var(--primary-color)] text-[14px] font-normal">
                                {betBuilderPriceLoading.value
                                  ? "…"
                                  : combinedBuildingOdds.value.toFixed(3)}
                              </span>
                            </div>
                            {betBuilderRejectMessage.value &&
                              !betBuilderCombinable.value && (
                                <p className="px-2 text-[11px] text-red-400">
                                  {betBuilderRejectMessage.value}
                                </p>
                              )}

                            <div className="w-full flex flex-col gap-1 px-2 py-2">
                              <input
                                key={`building-${forceUpdate}`}
                                type="number"
                                inputMode="numeric"
                                min={parlayStakeLimits.minStake}
                                max={parlayStakeLimits.maxStake}
                                value={
                                  buildingBetAmount?.value?.toString() || ""
                                }
                                onInput={(e) => {
                                  const value = (e.target as HTMLInputElement)
                                    .value;
                                  buildingBetAmount.value =
                                    parseFloat(value) || 0;
                                }}
                                placeholder={t("enterStake")}
                                className="w-full px-2 py-1.5 bg-[var(--sub-element-secondary)] text-[12px] border-[1px] border-[var(--border-color)] rounded-[4px] placeholder: focus:outline-none focus:border-[var(--focused-primary-border-color)]"
                              />

                              <div className="flex items-center justify-between text-[13px] font-bold">
                                <span className="">{t("possibleWin")}:</span>
                                <span className="text-[var(--primary-color)]">
                                  {formatCurrency(
                                    buildingBetAmount?.value *
                                      combinedBuildingOdds.value,
                                  )}
                                </span>
                              </div>
                            </div>
                          </>
                        )}

                        <div className="w-full flex flex-col gap-[2px]">
                          {nonBuildingOdds.map((bet, index) => (
                            <SelectedOddComponent
                              key={bet.oddsId}
                              bet={bet}
                              index={index}
                              forceUpdate={forceUpdate}
                              selectedBetType={
                                selectedBetType.value as "single" | "multi"
                              }
                              setForceUpdate={setForceUpdate}
                              minStake={singleStakeLimits.minStake}
                              maxStake={singleStakeLimits.maxStake}
                            />
                          ))}
                        </div>

                        {selectedBetType.value === "multi" &&
                          nonBuildingOdds.length > 0 && (
                            <>
                              <div className="w-full flex items-center justify-between px-2 py-2">
                                <span className=" text-[12px] font-normal">
                                  {t("odds")}
                                </span>
                                <span className="text-[var(--primary-color)] text-[14px] font-normal">
                                  {combinedMultipleOdds.value.toFixed(3)}
                                </span>
                              </div>

                              <div className="w-full flex flex-col gap-1 px-2 py-2">
                                <input
                                  key={`multiple-${forceUpdate}`}
                                  type="number"
                                  inputMode="numeric"
                                  min={parlayStakeLimits.minStake}
                                  max={parlayStakeLimits.maxStake}
                                  value={
                                    multipleBetAmount.value.toString() || ""
                                  }
                                  onInput={(e) => {
                                    const value = (e.target as HTMLInputElement)
                                      .value;
                                    multipleBetAmount.value =
                                      parseFloat(value) || 0;
                                  }}
                                  placeholder={t("enterStake")}
                                  className="w-full px-2 py-1.5 bg-[var(--sub-element-secondary)] text-[12px] border-[1px] border-[var(--border-color)] rounded-[4px] placeholder: focus:outline-none focus:border-[var(--focused-primary-border-color)]"
                                />

                                <div className="flex items-center justify-between text-[13px] font-bold">
                                  {/* <span className="">{t("possibleWin")}:</span> */}
                                  <span className="">
                                    {nonBuildingOdds.length === 2
                                      ? t("doubleEqualsOne")
                                      : `${nonBuildingOdds.length}-${t("foldEqualsOne")}`}
                                    :
                                  </span>
                                  <span className="text-[var(--primary-color)]">
                                    {formatCurrency(
                                      multipleBetAmount.value *
                                        combinedMultipleOdds.value,
                                    )}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}
                        {selectedBetType.value === "system" && (
                          <>
                            <div className="flex flex-col gap-1 mt-5 p-2 bg-white/5 rounded-[4px] border border-white/10">
                              <div className="text-white font-bold">
                                System Bet lines
                              </div>
                              {[
                                ...Array(Math.min(nonBuildingOdds.length, 5)),
                              ].map((_, i) => (
                                <SystemBetLineComponent
                                  key={i} // Always add a key for list items in React
                                  selections={nonBuildingOdds}
                                  systemSpecifier={i + 1} // Starts at 2, based on your original loop logic
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedBetType.value === "multi" &&
                    nonBuildingOdds.length > 1 && (
                      <div
                        className="flex items-center gap-2 mt-1 px-2 cursor-pointer"
                        onClick={() => (isBonusInfoOpen.value = true)}
                      >
                        <img
                          src={`${BASE_ASSET_PUBLIC_URL}/icons/info.png`}
                          alt="bonus"
                          className="w-4 h-4 brightness-0 invert"
                        />
                        <span className=" text-[12px]">{t("bonusInfo")}</span>
                      </div>
                    )}

                  <div className="flex flex-col w-full h-full gap-[2px]">
                    {xUserId === "" && (
                      <div className="w-full min-h-[34px] flex items-center justify-center bg-[#AA7F0033] rounded-[4px] py-[9px] px-[5px]">
                        <div className="flex items-center gap-2 px-[3px]">
                          <img
                            className="w-4 flex-shrink-0"
                            src={`${BASE_ASSET_PUBLIC_URL}/icons/wanning.png`}
                            alt="lock"
                          />
                          <span className="text-[12px] font-normal ">
                            To place your bet, please{" "}
                            <span
                              className={` transition-colors cursor-pointer ${
                                !isMobile.value ? "hover:" : ""
                              }`}
                              style={{ textDecoration: "underline" }}
                              onClick={() => {
                                window.postMessage(
                                  JSON.stringify({
                                    type: "click",
                                    target: "loginButton",
                                  }),
                                  "*",
                                );
                              }}
                            >
                              Sign in
                            </span>{" "}
                            or{" "}
                            <span
                              className={` transition-colors cursor-pointer ${
                                !isMobile.value ? "hover:" : ""
                              }`}
                              style={{ textDecoration: "underline" }}
                              onClick={() => {
                                window.postMessage(
                                  JSON.stringify({
                                    type: "click",
                                    target: "loginButton",
                                  }),
                                  "*",
                                );
                              }}
                            >
                              Register
                            </span>
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="w-full p-[5px] rounded-[4px]">
                      <div className="flex h-[37px] gap-[2px] items-center justify-center w-full min-w-0">
                        {isEditMode ? (
                          <>
                            <input
                              ref={firstInputRef}
                              type="number"
                              inputMode="numeric"
                              value={quickAmounts[0]}
                              onInput={(e) => {
                                const value = (e.target as HTMLInputElement)
                                  .value;
                                if (/^\d*\.?\d*$/.test(value)) {
                                  setQuickAmounts([
                                    parseFloat(value) || 0,
                                    quickAmounts[1],
                                    quickAmounts[2],
                                  ]);
                                }
                              }}
                              className="flex flex-1 min-w-0 w-full items-center justify-center h-full  text-[14px] font-normal px-[2px] rounded-[4px] border-[1px] border-[var(--border-color)] text-center focus:outline-none focus:border-[var(--focused-primary-border-color)] bg-[var(--sub-element-secondary)]"
                            />
                            <input
                              type="number"
                              inputMode="numeric"
                              value={quickAmounts[1]}
                              onInput={(e) => {
                                const value = (e.target as HTMLInputElement)
                                  .value;
                                if (/^\d*\.?\d*$/.test(value)) {
                                  setQuickAmounts([
                                    quickAmounts[0],
                                    parseFloat(value) || 0,
                                    quickAmounts[2],
                                  ]);
                                }
                              }}
                              className="flex flex-1 min-w-0 w-full items-center justify-center h-full  text-[14px] font-normal px-[2px] rounded-[4px] border-[1px] border-[var(--border-color)] text-center focus:outline-none focus:border-[var(--focused-primary-border-color)] bg-[var(--sub-element-secondary)]"
                            />
                            <input
                              type="number"
                              inputMode="numeric"
                              value={quickAmounts[2]}
                              onInput={(e) => {
                                const value = (e.target as HTMLInputElement)
                                  .value;
                                if (/^\d*\.?\d*$/.test(value)) {
                                  setQuickAmounts([
                                    quickAmounts[0],
                                    quickAmounts[1],
                                    parseFloat(value) || 0,
                                  ]);
                                }
                              }}
                              className="flex flex-1 min-w-0 w-full items-center justify-center h-full  text-[14px] font-normal px-[2px] rounded-[4px] border-[1px] border-[var(--border-color)] text-center focus:outline-none focus:border-[var(--focused-primary-border-color)] bg-[var(--sub-element-secondary)]"
                            />
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                handleQuickAmountClick(quickAmounts[0])
                              }
                              className={`flex flex-1 items-center justify-center h-full  text-[14px] font-normal px-[2px] rounded-[4px] transition-colors border-[1px] border-[var(--border-color)] cursor-pointer ${
                                !isMobile.value ? "hover:bg-white/10" : ""
                              }`}
                            >
                              {quickAmounts[0]}
                            </button>
                            <button
                              onClick={() =>
                                handleQuickAmountClick(quickAmounts[1])
                              }
                              className={`flex flex-1 items-center justify-center h-full  text-[14px] font-normal border-[1px] border-[var(--border-color)] px-[2px] rounded-[4px] transition-colors cursor-pointer ${
                                !isMobile.value ? "hover:bg-white/20" : ""
                              }`}
                            >
                              {quickAmounts[1]}
                            </button>
                            <button
                              onClick={() =>
                                handleQuickAmountClick(quickAmounts[2])
                              }
                              className={`flex flex-1 items-center justify-center h-full  text-[14px] font-normal border-[1px] border-[var(--border-color)] px-[2px] rounded-[4px] transition-colors cursor-pointer ${
                                !isMobile.value ? "hover:bg-white/20" : ""
                              }`}
                            >
                              {quickAmounts[2]}
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setIsEditMode(!isEditMode)}
                          className={`flex w-[34px] items-center justify-center h-full border-[1px] border-[var(--border-color)] rounded-[4px] transition-colors cursor-pointer ${
                            !isMobile.value ? "hover:bg-white/20" : ""
                          }`}
                        >
                          {isEditMode ? (
                            <svg
                              className="w-[18px] h-[18px] "
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            <img
                              src={`${BASE_ASSET_PUBLIC_URL}/icons/edit.png`}
                              alt="edit"
                              className={`w-[18px] h-[18px] ${baseTheme === "dark" ? "" : "brightness-0"}`}
                            />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="w-full rounded-[4px] p-[5px] mb-[20px] relative">
                      {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[var(--sub-element-secondary)] rounded-[4px] z-10">
                          <Loader />
                        </div>
                      )}
                      <button
                        onClick={() => {
                          handleBetNow();
                        }}
                        disabled={isLoading || !betable}
                        className={`w-full h-[36px] px-[10px] rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--primary-color)]`}
                      >
                        <span className="text-[12px] text-[var(--text-basic-color)] uppercase font-normal ">
                          {t("betNow")}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
