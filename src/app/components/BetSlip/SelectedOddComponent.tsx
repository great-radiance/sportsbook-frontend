/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useEffect } from "preact/hooks";
import { computed } from "@preact/signals";
import { SelectedOddType } from "@/shared/utils/bet";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import {
  sportsbookStore,
  selectionStoreKey,
  useSportsbookStore,
} from "@/state/sportsbookStoreContext";
import { useTranslate } from "@/shared/i18n/i18n";
import {
  getOddsMv,
  getOddsValue,
  hasSelectionOddsSource,
} from "@/helpers/getOddsValue";
import { removeFromOddsStore } from "@/helpers/storeEvent";
import { rotateBetSlipIdempotencyKey } from "@/helpers/betIdempotency";
import {
  formatCurrency,
  getCurrencySymbol,
} from "@/shared/utils/formatters";

interface SelectedOddComponentProps {
  bet: SelectedOddType;
  index: number;
  forceUpdate: number;
  selectedBetType: "single" | "multi" | "system";
  setForceUpdate: (updater: (prev: number) => number) => void;
  minStake?: number;
  maxStake?: number;
}

export const SelectedOddComponent: FunctionComponent<
  SelectedOddComponentProps
> = ({
  bet,
  forceUpdate,
  selectedBetType,
  minStake,
  maxStake,
}) => {
  const { currency } = useSportsbookStore();
  const { t } = useTranslate("betslip");
  const baseTheme = sportsbookStore.baseColorTheme.value;
  void sportsbookStore.storeState.value;
  void sportsbookStore.selectionsStoreState.value;

  const oddsValue = computed(() =>
    getOddsValue(bet.eventId, bet.marketId, Number(bet.oddsId)),
  );
  const oddsMv = computed(() =>
    getOddsMv(bet.eventId, bet.marketId, Number(bet.oddsId)),
  );

  const onRemove = (id: string) => {
    sportsbookStore.selectedOdds.value =
      sportsbookStore.selectedOdds.value.filter((bet) => bet.oddsId !== id);
    sportsbookStore.betSlipWarning.value = null;
    removeFromOddsStore([
      selectionStoreKey(bet.eventId, bet.marketId, Number(id)),
    ]);
  };

  const possibleWin = computed(() => bet.amount * oddsValue.value);

  const oddsUnavailable = !hasSelectionOddsSource(
    bet.eventId,
    bet.marketId,
    Number(bet.oddsId),
  );

  useEffect(() => {
    if (!oddsUnavailable) return;
    if (
      !sportsbookStore.selectedOdds.value.some((o) => o.oddsId === bet.oddsId)
    )
      return;
    sportsbookStore.selectedOdds.value =
      sportsbookStore.selectedOdds.value.filter((o) => o.oddsId !== bet.oddsId);
    removeFromOddsStore([
      selectionStoreKey(bet.eventId, bet.marketId, Number(bet.oddsId)),
    ]);
  }, [oddsUnavailable, bet.oddsId, bet.eventId, bet.marketId]);

  if (oddsUnavailable) return null;

  const stakeQuickButtons = [2, 10, 50];
  const setStake = (value: number) => {
    bet.amount = Math.max(0, value);
    sportsbookStore.selectedOdds.value = [
      ...sportsbookStore.selectedOdds.value,
    ];
    rotateBetSlipIdempotencyKey();
  };

  return (
    <div
      className={`flex w-full flex-col rounded-[12px] border border-[var(--border-color)] bg-[var(--sub-element-secondary)] p-3 ${oddsValue.value === 0 ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${bet.sport.id}.svg`}
            onError={(e) => {
              e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
            }}
            className={`h-5 w-5 shrink-0 ${baseTheme === "dark" ? "invert" : ""}`}
            alt=""
          />
          <span className="truncate text-[14px] font-bold leading-none">
            {bet.name || ""}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-[6px] bg-[var(--background-element)] px-2 py-1 text-[11px] font-bold leading-none">
            {oddsValue.value.toFixed(2)}
          </span>
          {selectedBetType === "system" && (
            <button
              className={`h-6 w-6 rounded-[6px] border border-[var(--border-color)] text-[11px] font-bold ${bet.selectedBank ? "bg-[var(--background-element)]" : "bg-transparent"}`}
              onClick={(e) => {
                e.stopPropagation();
                const idx = sportsbookStore.selectedOdds.value.findIndex(
                  (o) => o.oddsId === bet.oddsId,
                );
                if (idx !== -1) {
                  sportsbookStore.selectedOdds.value[idx] = {
                    ...sportsbookStore.selectedOdds.value[idx],
                    selectedBank:
                      !sportsbookStore.selectedOdds.value[idx].selectedBank,
                  };
                  sportsbookStore.selectedOdds.value = [
                    ...sportsbookStore.selectedOdds.value,
                  ];
                }
              }}
            >
              B
            </button>
          )}
          <button
            onClick={() => onRemove(bet.oddsId)}
            className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--border-color)]"
          >
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/trash.png`}
              alt="close"
              className="h-3.5 w-3.5"
            />
          </button>
        </div>
      </div>

      <div className="mt-1 text-[13px] font-normal text-[var(--text-sub-color)]">
        {bet.marketName || ""}
      </div>
      <div className="mt-1 flex flex-col gap-0.5 text-[12px]">
        <div className="flex items-center gap-1.5">
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-home.svg`}
            className="h-4 w-4 rounded-full"
            alt=""
          />
          <span className="truncate">{bet.participants[0]?.name || ""}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.svg`}
            className="h-4 w-4 rounded-full"
            alt=""
          />
          <span className="truncate">{bet.participants[1]?.name || ""}</span>
        </div>
      </div>

      {selectedBetType === "single" && !bet.isBuilding && (
        <>
          <div className="mt-3 flex items-center gap-1.5">
            <div className="flex h-10 min-w-0 flex-1 items-center rounded-[9px] border border-[var(--border-color)] bg-[var(--background-element)] px-2">
              <span className="shrink-0 text-[12px] text-[var(--text-sub-color)]">
                {getCurrencySymbol(currency.value)}
              </span>
              <input
                key={`${selectionStoreKey(bet.eventId, bet.marketId, Number(bet.oddsId))}-${forceUpdate}`}
                type="number"
                min={minStake}
                max={maxStake}
                value={Number(bet.amount).toString() || ""}
                onInput={(e) => {
                  const value = (e.target as HTMLInputElement).value;
                  if (/^\d*\.?\d*$/.test(value)) {
                    setStake(parseFloat(value) || 0);
                  }
                }}
                disabled={oddsValue.value === 0}
                inputMode="numeric"
                className="w-full bg-transparent px-1 text-[13px] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                onClick={() => setStake(value)}
                className="h-10 min-w-[48px] rounded-[9px] border border-[var(--border-color)] bg-[var(--background-element)] px-2 text-[13px] font-semibold"
              >
                +{value}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setStake(maxStake ?? 0)}
              className="h-10 min-w-[48px] rounded-[9px] border border-[var(--border-color)] bg-[var(--background-element)] px-2 text-[13px] font-semibold"
            >
              MAX
            </button>
          </div>
          <div className="mt-2 flex items-center justify-end text-[13px] font-semibold">
            <span className="text-[var(--text-sub-color)]">
              {formatCurrency(possibleWin.value, currency.value)} {t("profit")}
            </span>
          </div>
        </>
      )}

      {selectedBetType !== "single" && oddsMv.value !== 0 && (
        <div className="mt-2 text-right text-[11px] text-[var(--text-sub-color)]">
          mv {oddsMv.value > 0 ? `+${oddsMv.value}` : oddsMv.value}
        </div>
      )}
    </div>
  );
};
