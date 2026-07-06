/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import {
  sportsbookStore,
  selectionStoreKey,
  useSportsbookStore,
} from "@/state/sportsbookStoreContext";
import { removeFromOddsStore } from "@/helpers/storeEvent";
import { useTranslate } from "@/shared/i18n/i18n";
import type { BetBuilderSlipLeg } from "@/helpers/betslipLegs";
import { rotateBetSlipIdempotencyKey } from "@/helpers/betIdempotency";
import { formatCurrency, getCurrencySymbol } from "@/shared/utils/formatters";
import { hasSelectionOddsSource } from "@/helpers/getOddsValue";
import {
  clampStake,
  effectiveMaxStake,
} from "@/helpers/maxBetStake";

type BetBuilderGroupComponentProps = {
  leg: BetBuilderSlipLeg;
  maxSelections?: number;
  selectedBetType: "single" | "multi" | "system";
  forceUpdate: number;
  setForceUpdate: (updater: (prev: number) => number) => void;
  minStake?: number;
  maxStake?: number;
  fetchMaxStake?: () => Promise<number | null>;
  stakeLocked?: boolean;
};

export const BetBuilderGroupComponent: FunctionComponent<
  BetBuilderGroupComponentProps
> = ({
  leg,
  maxSelections = 13,
  selectedBetType,
  forceUpdate,
  setForceUpdate,
  minStake,
  maxStake,
  fetchMaxStake,
  stakeLocked = false,
}) => {
  useSignal();
  const { selectedOdds, betBuilderPricesByEvent, baseColorTheme, currency } =
    useSportsbookStore();
  const { t } = useTranslate("betslip");
  const [apiMaxBet, setApiMaxBet] = useState<number | null>(null);
  const [maxBetLoading, setMaxBetLoading] = useState(false);
  const baseTheme = baseColorTheme.value;

  const bbState = betBuilderPricesByEvent.value[leg.eventId];
  const priceLoading = bbState?.loading ?? false;
  const isCombinable = bbState?.combinable ?? false;
  const hasValidApiPrice =
    !priceLoading &&
    isCombinable &&
    typeof bbState?.price === "number" &&
    bbState.price > 1;
  const apiPrice = hasValidApiPrice ? bbState!.price! : null;

  const selectionKeys = leg.selections
    .map((s) => `${s.marketId}:${s.oddsId}`)
    .join("|");
  const groupAmountsKey = selectedOdds.value
    .filter((o) => o.eventId === leg.eventId)
    .map((o) => o.amount)
    .join(",");

  useEffect(() => {
    setApiMaxBet(null);
  }, [leg.eventId, selectionKeys, apiPrice]);

  useEffect(() => {
    const group = selectedOdds.value.filter((o) => o.eventId === leg.eventId);
    if (group.length >= 2) {
      const first = group[0].amount;
      if (group.some((o) => o.amount !== first)) {
        selectedOdds.value = selectedOdds.value.map((o) =>
          o.eventId === leg.eventId ? { ...o, amount: first } : o,
        );
      }
    }
  }, [leg.eventId, selectionKeys, groupAmountsKey]);

  useEffect(() => {
    const unavailable = leg.selections.filter(
      (sel) =>
        !hasSelectionOddsSource(sel.eventId, sel.marketId, Number(sel.oddsId)),
    );
    if (unavailable.length === 0) return;

    const removeKeys = new Set(
      unavailable.map((s) => `${s.marketId}:${s.oddsId}`),
    );
    selectedOdds.value = selectedOdds.value.filter(
      (o) =>
        !(
          o.eventId === leg.eventId &&
          removeKeys.has(`${o.marketId}:${o.oddsId}`)
        ),
    );
    removeFromOddsStore(
      unavailable.map((s) =>
        selectionStoreKey(s.eventId, s.marketId, Number(s.oddsId)),
      ),
    );
    rotateBetSlipIdempotencyKey();
  }, [leg.eventId, selectionKeys]);

  const availableSelections = leg.selections.filter((sel) =>
    hasSelectionOddsSource(sel.eventId, sel.marketId, Number(sel.oddsId)),
  );
  const eventParticipants = leg.selections[0]?.participants ?? [];

  if (availableSelections.length < 2) return null;

  const removeSelection = (marketId: number, oddsId: string) => {
    selectedOdds.value = selectedOdds.value.filter(
      (o) =>
        !(
          o.eventId === leg.eventId &&
          o.marketId === marketId &&
          o.oddsId === oddsId
        ),
    );
    sportsbookStore.betSlipWarning.value = null;
    removeFromOddsStore([
      selectionStoreKey(leg.eventId, marketId, Number(oddsId)),
    ]);
    rotateBetSlipIdempotencyKey();
  };

  const removeGroup = () => {
    const keys = leg.selections.map((s) =>
      selectionStoreKey(s.eventId, s.marketId, Number(s.oddsId)),
    );
    removeFromOddsStore(keys);
    selectedOdds.value = selectedOdds.value.filter(
      (o) => o.eventId !== leg.eventId,
    );
    sportsbookStore.betSlipWarning.value = null;
    rotateBetSlipIdempotencyKey();
  };

  const stakeAmount =
    selectedOdds.value.find((o) => o.eventId === leg.eventId)?.amount ?? 0;
  const stakeDisabled = priceLoading || !hasValidApiPrice || stakeLocked;
  const stakeQuickButtons = [2, 10, 50];
  const inputMaxStake = effectiveMaxStake(apiMaxBet, maxStake);

  const setStake = (value: number) => {
    const clamped = clampStake(value, apiMaxBet, maxStake);
    selectedOdds.value.forEach((o) => {
      if (o.eventId === leg.eventId) o.amount = clamped;
    });
    selectedOdds.value = [...selectedOdds.value];
    rotateBetSlipIdempotencyKey();
  };

  const handleMaxClick = async () => {
    if (!fetchMaxStake) return;
    setMaxBetLoading(true);
    try {
      const fetched = await fetchMaxStake();
      if (fetched != null) {
        setApiMaxBet(fetched);
        setStake(fetched);
        setForceUpdate((prev) => prev + 1);
      } else {
        setStake(maxStake ?? 0);
      }
    } finally {
      setMaxBetLoading(false);
    }
  };

  const displayOdds = priceLoading
    ? "…"
    : hasValidApiPrice
      ? apiPrice!.toFixed(2)
      : "—";
  const possibleWin =
    hasValidApiPrice && stakeAmount > 0 ? stakeAmount * apiPrice! : 0;
  const possibleWinLabel = priceLoading
    ? "…"
    : hasValidApiPrice && stakeAmount > 0
      ? `${formatCurrency(possibleWin, currency.value)} ${t("profit")}`
      : "—";

  const isBlocked = priceLoading || !isCombinable;

  return (
    <div
      className={`flex w-full flex-col rounded-[12px] border border-[var(--border-color)] bg-[var(--sub-element-secondary)] p-3 ${isBlocked ? "opacity-55" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${leg.sport.id}.svg`}
            onError={(e) => {
              e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
            }}
            className={`h-5 w-5 shrink-0 ${baseTheme === "dark" ? "invert" : ""}`}
            alt=""
          />
          <span className="truncate text-[14px] font-bold text-[var(--primary-color)]">
            {t("betBuilder")}
          </span>
          <span className="shrink-0 rounded-[6px] bg-[var(--background-element)] px-1.5 py-[1px] text-[11px] font-bold">
            {availableSelections.length}/{maxSelections}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-[6px] bg-[var(--background-element)] px-2 py-1 text-[12px] font-bold tabular-nums text-[var(--text-basic-color)]">
            {displayOdds}
          </span>
          <button
            type="button"
            onClick={removeGroup}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--border-color)] bg-[var(--background-element)]"
            aria-label="Remove bet builder"
          >
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/trash.png`}
              alt=""
              className="h-4 w-4"
            />
          </button>
        </div>
      </div>

      <div className="mt-1 flex flex-col gap-0.5 text-[12px] text-[var(--text-basic-color)]">
        <div className="flex items-center gap-1.5">
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-home.svg`}
            className="h-4 w-4 rounded-full"
            alt=""
          />
          <span className="truncate">{eventParticipants[0]?.name || ""}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.svg`}
            className="h-4 w-4 rounded-full"
            alt=""
          />
          <span className="truncate">{eventParticipants[1]?.name || ""}</span>
        </div>
      </div>

      <div className="mt-1 text-[12px] font-normal text-[var(--text-sub-color)]">
        {leg.eventName}
      </div>

      <div className="mt-1 flex flex-col">
        {availableSelections.map((sel, index) => {
          const isLast = index === availableSelections.length - 1;
          return (
            <div
              key={selectionStoreKey(
                sel.eventId,
                sel.marketId,
                Number(sel.oddsId),
              )}
              className="flex gap-2 pb-1"
            >
              <div className="relative flex w-4 shrink-0 self-stretch flex-col items-center">
                {!isLast && (
                  <span
                    className="absolute left-1/2 top-[10px] -bottom-1 w-[2px] -translate-x-1/2 bg-[var(--primary-color)] opacity-70"
                    aria-hidden
                  />
                )}
                <span className="relative z-[1] mt-1 h-2 w-2 shrink-0 rounded-full border-2 border-[var(--primary-color)] bg-[var(--sub-element-secondary)]" />
              </div>
              <div className="mb-1 flex min-w-0 flex-1 items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-bold leading-tight">
                    {sel.name}
                  </div>
                  <div className="truncate text-[13px] text-[var(--text-sub-color)]">
                    {sel.marketName}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeSelection(sel.marketId, sel.oddsId)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border border-[var(--border-color)]"
                  aria-label="Remove selection"
                >
                  <img
                    src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/trash.png`}
                    alt=""
                    className="h-3.5 w-3.5 opacity-80"
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedBetType === "single" && (
        <div className="mt-2 flex flex-col">
          <div className="flex items-center gap-1.5">
            <div className="flex h-10 min-w-0 flex-1 items-center rounded-[9px] border border-[var(--border-color)] bg-[var(--background-element)] px-2">
              <span className="shrink-0 text-[12px] text-[var(--text-sub-color)]">
                {getCurrencySymbol(currency.value)}
              </span>
              <input
                key={`bb-stake-${leg.eventId}-${forceUpdate}`}
                type="number"
                min={minStake}
                max={inputMaxStake}
                inputMode="numeric"
                value={Number(stakeAmount).toString() || ""}
                disabled={stakeDisabled}
                readOnly={stakeLocked}
                onInput={(e) => {
                  const value = (e.target as HTMLInputElement).value;
                  if (/^\d*\.?\d*$/.test(value)) {
                    setStake(parseFloat(value) || 0);
                  }
                }}
                className="w-full bg-transparent px-1 text-[13px] outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/icons/edit.png`}
                alt=""
                className="h-3.5 w-3.5 opacity-70"
              />
            </div>
            {stakeQuickButtons.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStake(stakeAmount + value)}
                disabled={stakeLocked}
                className="h-10 min-w-[48px] rounded-[9px] border border-[var(--border-color)] bg-[var(--background-element)] px-2 text-[13px] font-semibold disabled:opacity-50"
              >
                +{value}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void handleMaxClick()}
              disabled={
                maxBetLoading || stakeDisabled || !fetchMaxStake
              }
              className="h-10 min-w-[48px] rounded-[9px] border border-[var(--border-color)] bg-[var(--background-element)] px-2 text-[13px] font-semibold disabled:opacity-50"
            >
              MAX
            </button>
          </div>
          <div className="mt-2 flex items-center justify-end text-[12px] font-semibold">
            <span className="text-[var(--text-sub-color)]">
              {possibleWinLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
