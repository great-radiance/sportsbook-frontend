import { useTranslate } from "@/shared/i18n/i18n";
import { useMemo } from "preact/hooks";

export interface SpecialNavigationItem {
  id: string;
  name: string;
  icon?: string;
  color: string;
  hasArrow?: boolean;
  isExpandable: boolean;
  link?: string;
}

export const useSpecialNavigationItems = () => {
  const { t } = useTranslate("sidebar");
  const navigationItems = useMemo<SpecialNavigationItem[]>(
    () => [
      {
        id: "upcoming",
        name: t("Complete_Coupon"),
        icon: "coupon",
        color: "teal",
        isExpandable: false,
        link: "/event-view/sport/Soccer/1/upcoming",
      },
      {
        id: "outright",
        name: t("Outright_Winners"),
        icon: "winner",
        color: "purple",
        isExpandable: false,
        link: "/event-view/special/outright",
      },
      {
        id: "popular",
        name: t("top_matches"),
        icon: "special",
        color: "purple",
        isExpandable: false,
        link: "/event-view/special/popular",
      },
      // {
      //   id: "boosted",
      //   name: t("Odds-on_coupon"),
      //   icon: "odds",
      //   color: "green",
      //   isExpandable: false,
      // },
      {
        id: "competitions",
        name: t("FAVOURITE_COMPETITIONS"),
        // icon: "multiple",
        color: "yellow",
        hasArrow: true,
        isExpandable: true,
      },
    ],
    [t],
  );

  return navigationItems;
};
