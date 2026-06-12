/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { selectedOdds, betBuilderPricesByEvent } from "@/state/betState";
import { removeFromOddsStore } from "@/helpers/storeEvent";
import { selectionStoreKey } from "@/state/storeState";
import { useTranslate } from "@/shared/i18n/i18n";
import { baseColorTheme } from "@/state/baseColorTheme";
import type { BetBuilderSlipLeg } from "@/helpers/betslipLegs";
import { rotateBetSlipIdempotencyKey } from "@/helpers/betIdempotency";
import { formatCurrency } from "@/shared/utils/formatters";
import { hasSelectionOddsSource } from "@/helpers/getOddsValue";

type BetBuilderGroupComponentProps = {
  leg: BetBuilderSlipLeg;
  maxSelections?: number;
  selectedBetType: "single" | "multi" | "system";
  forceUpdate: number;
  setForceUpdate: (updater: (prev: number) => number) => void;
  minStake?: number;
  maxStake?: number;
};

export const BetBuilderGroupComponent: FunctionComponent<
  BetBuilderGroupComponentProps
> = ({
  leg,
  maxSelections = 13,
  selectedBetType,
  forceUpdate,
  minStake,
  maxStake,
}) => {
  useSignal();
  const { t } = useTranslate("betslip");
  const baseTheme = baseColorTheme.value;

  const bbState = betBuilderPricesByEvent.value[leg.eventId];
  const priceLoading = bbState?.loading ?? false;
  const isCombinable = bbState?.combinable ?? false;
  const rejectMessage = bbState?.rejectMessage ?? null;
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
        !hasSelectionOddsSource(
          sel.eventId,
          sel.marketId,
          Number(sel.oddsId),
        ),
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
    rotateBetSlipIdempotencyKey();
  };

  const stakeAmount =
    selectedOdds.value.find((o) => o.eventId === leg.eventId)?.amount ?? 0;
  const stakeDisabled = priceLoading || !hasValidApiPrice;

  const setStake = (value: number) => {
    selectedOdds.value.forEach((o) => {
      if (o.eventId === leg.eventId) o.amount = value;
    });
    selectedOdds.value = [...selectedOdds.value];
    rotateBetSlipIdempotencyKey();
  };

  const displayOdds = priceLoading ? "…" : hasValidApiPrice ? apiPrice!.toFixed(2) : "—";
  const possibleWin =
    hasValidApiPrice && stakeAmount > 0
      ? formatCurrency(stakeAmount * apiPrice!)
      : priceLoading
        ? "…"
        : "—";

  const isBlocked = priceLoading || !isCombinable;

  return (
    <div
      className={`flex w-full flex-col gap-2 rounded-[12px] border border-[var(--border-color)] bg-[var(--sub-element-secondary)] p-2 animate-[fade-in_0.3s_ease-out] ${isBlocked ? "opacity-50" : ""}`}
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
          <span className="truncate text-[13px] font-bold text-[var(--primary-color)]">
            {t("betBuilder")}
          </span>
          <span className="shrink-0 rounded-full border border-[var(--primary-border-color)] px-1.5 py-[1px] text-[10px] font-bold">
            {availableSelections.length}/{maxSelections}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-[4px] bg-[var(--background-element)] px-2 py-1 text-[12px] font-bold tabular-nums text-[var(--text-basic-color)]">
            {displayOdds}
          </span>
          <button
            type="button"
            onClick={removeGroup}
            className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-[var(--background-element)]"
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

      {!priceLoading && !isCombinable && rejectMessage && (
        <div className="rounded-[4px] bg-[var(--background-element)] px-2 py-1.5 text-[11px] text-[var(--text-sub-color)]">
          {rejectMessage}
        </div>
      )}

      <div className="text-[12px] font-normal text-[var(--text-basic-color)]">
        {leg.eventName}
      </div>

      <div className="flex flex-col">
        {availableSelections.map((sel, index) => {
          const isLast = index === availableSelections.length - 1;
          return (
            <div
              key={selectionStoreKey(
                sel.eventId,
                sel.marketId,
                Number(sel.oddsId),
              )}
              className="flex gap-2"
            >
              <div className="flex w-4 shrink-0 flex-col items-center">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--primary-color)]" />
                {!isLast && (
                  <span className="my-0.5 w-[2px] flex-1 min-h-[20px] bg-[var(--primary-color)]" />
                )}
              </div>
              <div className="mb-2 flex min-w-0 flex-1 items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold leading-tight">
                    {sel.name}
                  </div>
                  <div className="truncate text-[11px] text-[var(--text-sub-color)]">
                    {sel.marketName}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeSelection(sel.marketId, sel.oddsId)}
                  className="shrink-0 p-1"
                  aria-label="Remove selection"
                >
                  <img
                    src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/trash.png`}
                    alt=""
                    className="h-3.5 w-3.5 opacity-70"
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedBetType === "single" && (
        <div className="mt-1 flex flex-col gap-1">
          <input
            key={`bb-stake-${leg.eventId}-${forceUpdate}`}
            type="number"
            min={minStake}
            max={maxStake}
            inputMode="numeric"
            value={stakeAmount.toString()}
            disabled={stakeDisabled}
            onInput={(e) => {
              const value = (e.target as HTMLInputElement).value;
              if (/^\d*\.?\d*$/.test(value)) {
                setStake(parseFloat(value) || 0);
              }
            }}
            placeholder={t("enterStake")}
            className="w-full rounded-[4px] border-[2px] border-[var(--border-color)] bg-[var(--sub-element-secondary)] px-2 py-1.5 text-[12px] focus:border-[var(--focused-primary-border-color)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex items-center justify-between text-[13px] font-bold">
            <span>{t("possibleWin")}:</span>
            <span className="text-[var(--primary-color)]">{possibleWin}</span>
          </div>
        </div>
      )}
    </div>
  );
};
