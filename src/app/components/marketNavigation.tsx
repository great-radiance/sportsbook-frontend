import { FunctionComponent } from "preact";
import { HorizontalTabs } from "./HorizontalTabs";
import { getTranslatedText } from "@/helpers/getTranslate";
import { isMobile } from "@/state/isMobile";
import { MARKET_NAMES } from "@/shared/utils/marketNames";
import { useEffect } from "preact/hooks";

interface MarketNavigationProps {
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  className?: string;
}

export const MarketNavigation: FunctionComponent<MarketNavigationProps> = ({
  options,
  selectedValue,
  onSelect,
  className,
}) => {
  // getTranslate(options.map((option) => option.label));
  options = options?.length > 0 ? options : MARKET_NAMES;
  useEffect(() => {
    onSelect(options[0]);
  }, [options]);

  return (
    <div className={`flex w-full text-[var(--text-basic-color)] ${className}`}>
      <HorizontalTabs
        className={`w-full min-w-0 px-4`}
        scrollerClassName={`${isMobile.value ? "touch-pan-x" : ""} snap-x snap-mandatory`}
      >
        {options.map((option: string) => {
          const isSelected = selectedValue === option;
          return (
            <button
              role="tab"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              title={option}
              key={option}
              className={`snap-start shrink-0 flex px-1 items-center justify-center whitespace-nowrap transition-colors text-sm ${
                isSelected
                  ? "border-b-[2px] border-[var(--primary-border-color)] font-bold"
                  : "hover:pb-[2px]"
              } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}
              onClick={() => onSelect(option)}
            >
              <span>{getTranslatedText(option)}</span>
            </button>
          );
        })}
      </HorizontalTabs>
    </div>
  );
};
