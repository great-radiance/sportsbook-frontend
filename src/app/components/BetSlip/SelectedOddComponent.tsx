/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { SelectedOddType } from "@/shared/utils/bet";
import { BASE_ASSET_PUBLIC_URL, getAppConfig } from "@/shared/config/appConfig";
import { selectedOdds } from "@/state/betState";
import { isMobile } from "@/state/isMobile";
import { useTranslate } from "@/shared/i18n/i18n";
import { getOddsValue } from "@/helpers/getOddsValue";
import { computed } from "@preact/signals";
import { removeFromOddsStore } from "@/helpers/storeEvent";
import { baseColorTheme } from "@/state/baseColorTheme";

interface SelectedOddComponentProps {
  bet: SelectedOddType;
  index: number;
  forceUpdate: number;
  selectedBetType: "single" | "multi" | "system";
  setForceUpdate: (updater: (prev: number) => number) => void;
}

export const SelectedOddComponent: FunctionComponent<
  SelectedOddComponentProps
> = ({ bet, index, forceUpdate, selectedBetType, setForceUpdate }) => {
  const { t } = useTranslate("betslip");
  const baseTheme = baseColorTheme.value;
  const oddsValue = computed(() => {
    return getOddsValue(bet.eventId, bet.marketId, bet.oddsId);
  });

  const calculatePossibleWin = (stake: number, odds: number): number => {
    return stake * odds;
  };

  const onRemove = (id: string) => {
    selectedOdds.value = selectedOdds.value.filter((bet) => bet.oddsId !== id);
    removeFromOddsStore([id]);
  };

  const handleCopyStakeToAll = (stake: number) => {
    if (selectedOdds.value.length === 0) return;
    selectedOdds.value.forEach((bet) => {
      bet.amount = stake;
    });
    // Force re-render to update input values
    selectedOdds.value = [...selectedOdds.value];
    setForceUpdate((prev) => prev + 1);
  };

  const possibleWin = calculatePossibleWin(bet.amount, oddsValue.value);

  if (oddsValue.value === -1 || oddsValue.value === 1) {
    selectedOdds.value = selectedOdds.value.filter(
      (o) => o.oddsId !== bet.oddsId,
    );
    selectedOdds.value = [...selectedOdds.value];
    return null;
  }

  return (
    <div
      className={`flex flex-col w-full bg-[var(--sub-element-secondary)] ${oddsValue.value === 0 && "opacity-50"} border-[1px] p-2 border-[var(--border-color)] rounded-[12px] animate-[fade-in_0.3s_ease-out]`}
    >
      <div
        className={`w-full rounded-[4px] flex flex-col gap-1 overflow-hidden relative ${bet.isBuilding ? "border-l-[2px] border-[var(--primary-color)] pl-2" : ""}`}
      >
        {/* Selection name */}
        <div className="flex items-center justify-between w-full text-[14px] font-bold">
          <div className="flex items-center gap-2">
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportsicons/${bet.sport}.png`}
              onError={(e) => {
                e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/sportsicons/default.png`;
              }}
              className={`w-5 h-5 ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
            />
            {bet.name || ""}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRemove(bet.oddsId)}
              className={`flex items-center justify-end w-full transition-colors ${!isMobile.value ? "hover:" : ""}`}
            >
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/trash.png`}
                alt="close"
                className="w-4"
              />
            </button>
            <span className="text-[var(--primary-color)] text-[12px] font-normal">
              {oddsValue.value.toFixed(2)}
            </span>
          </div>
        </div>
        {/* Market name */}
        <div className="flex justify-between text-[12px] font-normal">
          {bet.marketName || ""}
          {!bet.isBuilding && selectedBetType === "system" && (
            <button
              className={`w-5 h-5 rounded-[2px] ${bet.selectedBank ? "bg-[var(--primary-color)] text-black" : "bg-[var(--background-element)] "}`}
              onClick={(e) => {
                e.stopPropagation();
                const idx = selectedOdds.value.findIndex(
                  (o) => o.oddsId === bet.oddsId,
                );
                if (idx !== -1) {
                  // toggle on the item in the shared state and replace the array to trigger reactivity
                  selectedOdds.value[idx] = {
                    ...selectedOdds.value[idx],
                    selectedBank: !selectedOdds.value[idx].selectedBank,
                  };
                  selectedOdds.value = [...selectedOdds.value];
                } else {
                  // fallback: toggle local object and still replace array
                  bet.selectedBank = !bet.selectedBank;
                  selectedOdds.value = [...selectedOdds.value];
                }
              }}
            >
              B
            </button>
          )}
        </div>
        {/* Event name */}
        <div className="text-[12px] font-normal">
          {bet.participants[0]?.name || ""} -{" "}
          {bet.participants[1]?.name || ""}
        </div>
        {/* Stake input - only show for single bets */}
        {selectedBetType === "single" && !bet.isBuilding && (
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  key={`${bet.oddsId}-${forceUpdate}`}
                  type="number"
                  value={bet.amount.toString()}
                  onInput={(e) => {
                    const value = (e.target as HTMLInputElement).value;
                    if (/^\d*\.?\d*$/.test(value)) {
                      bet.amount = parseFloat(value) || 0;
                      selectedOdds.value = [...selectedOdds.value];
                    }
                  }}
                  disabled={oddsValue.value === 0}
                  inputMode="numeric"
                  placeholder={t("enterStake")}
                  className="w-full px-2 py-1.5 text-[12px] bg-[var(--sub-element-secondary)] border-[2px] border-[var(--border-color)] rounded-[4px] placeholder: focus:outline-none focus:border-[var(--focused-primary-border-color)]"
                />
              </div>
              {index === 0 && (
                <button
                  onClick={() => handleCopyStakeToAll(bet.amount)}
                  className={`px-2 py-1.5 border-[1px] border-[var(--border-color)] rounded-[4px] transition-colors ${!isMobile.value ? "hover:bg-white/20" : ""}`}
                  title={t("copyStakeToAll")}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-center font-bold justify-between text-[13px]">
              <span>{t("possibleWin")}:</span>
              <span className="text-[var(--primary-color)]">
                {possibleWin.toFixed(2)}₺
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
