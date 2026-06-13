import { FunctionComponent } from "preact";
import { HorizontalTabs } from "./HorizontalTabs";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { MARKET_NAMES } from "@/shared/utils/marketNames";
import { useEffect, useMemo } from "preact/hooks";
import { marketTypesEqual } from "@/helpers/sidebarMarketNavigation";

/** Sidebar `marketsRef` entry — `id` is the market type passed to `Match`. */
export type MarketNavOption = { id: number[] | number; label: string };

const FALLBACK_NAV_OPTIONS: MarketNavOption[] = [
  { id: 1, label: "Match Result" },
  { id: 66, label: "Total" },
  { id: 47, label: "Handicap" },
];

type MarketNavigationProps = {
  className?: string;
} & (
  | {
      options: MarketNavOption[];
      selectedValue: number[] | number;
      onSelect: (value: number[] | number) => void;
    }
  | {
      options: string[];
      selectedValue: string;
      onSelect: (value: string) => void;
    }
);

function isNumericOptions(
  options: MarketNavOption[] | string[],
): options is MarketNavOption[] {
  return (
    options.length > 0 &&
    typeof options[0] === "object" &&
    options[0] !== null &&
    "id" in options[0]
  );
}

export const MarketNavigation: FunctionComponent<MarketNavigationProps> = (
  props,
) => {
  const { isMobile } = useSportsbookStore();
  const { className, options, selectedValue, onSelect } = props;
  const idMode = isNumericOptions(options);

  const navOptions = useMemo((): MarketNavOption[] => {
    if (!options?.length) {
      return idMode
        ? FALLBACK_NAV_OPTIONS
        : MARKET_NAMES.map((label, i) => ({
            id: i + 1,
            label,
          }));
    }
    if (idMode) {
      return options;
    }
    return options.map((label, i) => ({ id: i + 1, label }));
  }, [options, idMode]);

  useEffect(() => {
    const first = navOptions[0];
    if (!first) return;
    if (idMode) {
      (onSelect as (value: number[] | number) => void)(first.id);
    } else {
      (onSelect as (value: string) => void)(first.label);
    }
  }, [navOptions, idMode, onSelect]);

  return (
    <div className={`flex w-full text-[var(--text-basic-color)] ${className}`}>
      <HorizontalTabs
        className="w-full min-w-0 px-4"
        scrollerClassName={`${isMobile.value ? "touch-pan-x" : ""} snap-x snap-mandatory`}
      >
        {navOptions.map((option) => {
          const isSelected = idMode
            ? marketTypesEqual(selectedValue as number[] | number, option.id)
            : selectedValue === option.label;
          return (
            <button
              role="tab"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              title={option.label}
              key={option.label}
              type="button"
              className={`snap-start shrink-0 flex px-1 items-center justify-center whitespace-nowrap transition-colors text-[12px] ${
                isSelected
                  ? "border-b-[2px] border-[var(--primary-border-color)] font-bold"
                  : "hover:pb-[2px]"
              } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}
              onClick={() =>
                idMode
                  ? (onSelect as (value: number[] | number) => void)(option.id)
                  : (onSelect as (value: string) => void)(option.label)
              }
            >
              <span>{option.label}</span>
            </button>
          );
        })}
      </HorizontalTabs>
    </div>
  );
};
