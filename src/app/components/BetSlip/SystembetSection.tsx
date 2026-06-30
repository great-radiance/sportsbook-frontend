/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useMemo, useState } from "preact/hooks";
import { rotateBetSlipIdempotencyKey } from "@/helpers/betIdempotency";
import {
  combinationCount,
  getDefaultNamedSystem,
  getNamedSystemTotals,
  getSystemSizeLabel,
  getSystemSizeTotalOdds,
  NAMED_SYSTEM_STAKE_KEY,
} from "@/helpers/systemBet";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { useTranslate } from "@/shared/i18n/i18n";
import { formatOdds, getCurrencySymbol } from "@/shared/utils/formatters";
import { SelectedOddType } from "@/shared/utils/bet";
import {
  sportsbookStore,
  useSportsbookStore,
} from "@/state/sportsbookStoreContext";

function SystemBetRow({
  label,
  totalOdds,
  stake,
  currencySymbol,
  minStake,
  maxStake,
  onStakeChange,
  fetchMaxStake,
  infoTitle,
}: {
  label: string;
  totalOdds: number;
  stake: number;
  currencySymbol: string;
  minStake?: number;
  maxStake?: number;
  onStakeChange: (value: number) => void;
  fetchMaxStake?: () => Promise<number | null>;
  infoTitle?: string;
}) {
  const [isFetchingMaxStake, setIsFetchingMaxStake] = useState(false);

  const handleMaxStake = async () => {
    if (!fetchMaxStake) return;

    setIsFetchingMaxStake(true);
    try {
      const amount = await fetchMaxStake();
      if (amount != null) {
        onStakeChange(amount);
        rotateBetSlipIdempotencyKey();
      }
    } finally {
      setIsFetchingMaxStake(false);
    }
  };

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate text-[12px] font-semibold text-[var(--text-basic-color)]">
          {label}
        </span>
        {infoTitle ? (
          <span
            className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-white/40 text-[9px] font-bold text-white/80"
            title={infoTitle}
          >
            i
          </span>
        ) : null}
      </div>

      <span className="w-[52px] shrink-0 text-right text-[12px] font-bold text-[var(--text-basic-color)]">
        {formatOdds(totalOdds)}
      </span>

      <div className="flex shrink-0 items-center gap-1.5">
        <div className="flex h-10 w-[110px] shrink-0 items-center rounded-[9px] border border-[var(--border-color)] bg-[var(--background-element)] px-2">
          <span className="shrink-0 text-[12px] text-[var(--text-sub-color)]">
            {currencySymbol}
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={minStake}
            max={maxStake}
            aria-label={`Stake amount (${currencySymbol})`}
            value={stake > 0 ? stake.toString() : ""}
            onInput={(e) => {
              const value = (e.target as HTMLInputElement).value;
              onStakeChange(parseFloat(value) || 0);
              rotateBetSlipIdempotencyKey();
            }}
            className="w-full bg-transparent px-1 text-[13px] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/edit.png`}
            alt=""
            className="h-3.5 w-3.5 shrink-0 opacity-70"
          />
        </div>
        <button
          type="button"
          disabled={isFetchingMaxStake || !fetchMaxStake}
          className="h-10 rounded-[9px] border border-[var(--border-color)] bg-[var(--background-element)] px-3 text-[13px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => {
            void handleMaxStake();
          }}
        >
          MAX
        </button>
      </div>
    </div>
  );
}

const SystemBetSection: FunctionComponent<{
  selections: SelectedOddType[];
  minStake?: number;
  maxStake?: number;
  fetchMaxStake?: () => Promise<number | null>;
}> = ({ selections, minStake, maxStake, fetchMaxStake }) => {
  const { t } = useTranslate("betslip");
  const { currency, systemBetSpecifier, selectionsStoreState } =
    useSportsbookStore();
  void selectionsStoreState.value;

  const currencySymbol = getCurrencySymbol(currency.value);

  const namedSystem = useMemo(
    () => getDefaultNamedSystem(selections.length),
    [selections.length],
  );

  const setSizeStake = (size: number, stake: number) => {
    systemBetSpecifier.value = {
      ...systemBetSpecifier.value,
      [size]: stake,
    };
  };

  const setNamedStake = (stake: number) => {
    systemBetSpecifier.value = {
      ...systemBetSpecifier.value,
      [NAMED_SYSTEM_STAKE_KEY]: stake,
    };
  };

  const namedStake = systemBetSpecifier.value[NAMED_SYSTEM_STAKE_KEY] ?? 0;

  const sizes = useMemo(
    () => Array.from({ length: selections.length }, (_, index) => index + 1),
    [selections.length],
  );

  return (
    <div className="flex flex-col gap-0.5">
      {sizes.map((size) => {
        const count = combinationCount(selections.length, size);
        const totalOdds = getSystemSizeTotalOdds(selections, size);
        const stake = systemBetSpecifier.value[size] ?? 0;

        return (
          <SystemBetRow
            key={size}
            label={getSystemSizeLabel(size, count, t)}
            totalOdds={totalOdds}
            stake={stake}
            currencySymbol={currencySymbol}
            minStake={minStake}
            maxStake={maxStake}
            onStakeChange={(value) => setSizeStake(size, value)}
            fetchMaxStake={fetchMaxStake}
          />
        );
      })}

      {namedSystem ? (
        <SystemBetRow
          label={`${namedSystem.label} = ${getNamedSystemTotals(selections, namedSystem).combinationCount}`}
          totalOdds={getNamedSystemTotals(selections, namedSystem).totalOdds}
          stake={namedStake}
          currencySymbol={currencySymbol}
          minStake={minStake}
          maxStake={maxStake}
          onStakeChange={setNamedStake}
          fetchMaxStake={fetchMaxStake}
          infoTitle={t("systemNamedInfo")}
        />
      ) : null}
    </div>
  );
};

export default SystemBetSection;
