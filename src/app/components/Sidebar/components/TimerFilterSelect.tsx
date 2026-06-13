import { Select, SelectItem } from "@/app/components/Select";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { useTranslate } from "@/shared/i18n/i18n";
import { useMemo, useState } from "preact/hooks";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";

export const TimerFilterSelect = () => {
  const { isMobile } = useSportsbookStore();
  const { t } = useTranslate("sidebar");
  const { t: tCommon } = useTranslate("common");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>("all");

  const timeFilterOptions = useMemo(
    () => [
      { value: "all", label: tCommon("all") },
      { value: "today", label: t("today") },
      { value: "time3hours", label: t("time3hours") },
      { value: "time6hours", label: t("time6hours") },
      { value: "time12hours", label: t("time12hours") },
      { value: "time24hours", label: t("time24hours") },
      { value: "time48hours", label: t("time48hours") },
      { value: "time72hours", label: t("time72hours") },
    ],
    [t, tCommon],
  );

  return (
    <Select
      value={selectedTimeFilter}
      onSelect={(value) => setSelectedTimeFilter(value as string)}
      triggerIcon={`${BASE_ASSET_PUBLIC_URL}/icons/clock.svg`}
      className="h-[28px] px-1 min-w-fit"
      classNames={{
        trigger:
          "h-[28px] min-w-fit items-center justify-center gap-1 px-2 py-1 text-[12px] rounded-[4px] bg-white/15  transition-colors",
        panel:
          "bg-[var(--sub-element-color)] rounded-[4px] max-h-[200px] min-w-full",
        item: `px-2 py-1.5 rounded-[4px]  transition-colors text-left bg-white/15 ${
          !isMobile.value ? "hover:bg-white/25" : ""
        } whitespace-nowrap`,
      }}
    >
      {timeFilterOptions.map((option) => (
        <SelectItem
          key={option.value}
          value={option.value}
          className={selectedTimeFilter === option.value ? "bg-white/25" : ""}
        >
          {option.label}
        </SelectItem>
      ))}
    </Select>
  );
};
