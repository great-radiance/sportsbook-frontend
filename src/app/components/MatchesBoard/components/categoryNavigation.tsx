import { useTranslate } from "@/shared/i18n/i18n";
import { HorizontalTabs } from "../../HorizontalTabs";
import { useState } from "preact/hooks";

const { t } = useTranslate("matches");

export const CATEGORY_NAVIGATION_OPTIONS = {
  hot: t("hot"),
  matches: t("matches"),
  outrights: t("outrights"),
  standings: t("standings"),
};

export const CategoryNavigation = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("hot");
  return (
    <div>
      <HorizontalTabs>
        {Object.entries(CATEGORY_NAVIGATION_OPTIONS).map(([key, value]) => (
          <button
            key={key}
            className="text-[var(--text-notheme-color)]"
            onClick={() => setSelectedCategory(key)}
          >
            {value}
          </button>
        ))}
      </HorizontalTabs>
    </div>
  );
};
