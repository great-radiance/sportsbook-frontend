import { FunctionComponent } from "preact";
import { useState, useMemo } from "preact/hooks";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { useLocation } from "wouter-preact";
import {
  SpecialNavigationItem,
  useSpecialNavigationItems,
} from "@/hooks/useSpecialNavigationItems";
import { useRouteParams } from "@/hooks/useRotueParams";
import { useTranslate } from "@/shared/i18n/i18n";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { sidebarNode } from "@/api/sidebar/apiGetSidebar";
import { linkButtonOnClick } from "@/helpers/linkButtonClick";

interface SpecialNavigationProps {}

/** Same segment rules as `PrematchSportsNavigation.buildPrematchPath`. */
function buildPrematchPath(
  sportName: string,
  sportId: number,
  regionName?: string,
  regionId?: number,
  leagueName?: string,
  leagueId?: number | string,
): string {
  const parts = [
    sportName,
    String(sportId),
    regionName,
    regionId == null ? "" : String(regionId),
    leagueName,
    leagueId == null ? "" : String(leagueId),
  ]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  return `/event-view/pre-match/${parts.join("/")}`;
}

export const SpecialNavigation: FunctionComponent<
  SpecialNavigationProps
> = () => {
  const { isMobile, isOpenedSidebar, baseColorTheme, summarySportsState } =
    useSportsbookStore();
  const [, setLocation] = useLocation();
  const { sportName } = useRouteParams();
  const { t: tCommon } = useTranslate("common");
  const baseTheme = baseColorTheme.value;

  const featuredLeagues = useMemo(() => {
    return (
      summarySportsState.value.find((node) => node.type === "featured_leagues")
        ?.children ?? []
    );
  }, [summarySportsState.value]);

  const [itemExpanded, setItemExpanded] = useState<Record<string, boolean>>({});
  const navigationItems = useSpecialNavigationItems();

  const onNavigationItemClick = (item: SpecialNavigationItem) => {
    if (item.isExpandable) {
      setItemExpanded((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
    } else {
      if (isMobile.value) {
        isOpenedSidebar.value = false;
      }
      setLocation(item.link || "");
    }
  };

  return (
    <div className="flex flex-col w-full text-[var(--text-basic-color)] rounded-[4px]">
      {navigationItems.map((item) => (
        <div
          key={item.id}
          className={`${item.id === "competitions" ? "flex" : ""} flex flex-col w-full rounded-[4px] overflow-hidden ${
            item.id === sportName ? "font-bold" : ""
          }`}
          style={
            item.id === sportName
              ? { background: "var(--selected-item-color)" }
              : undefined
          }
        >
          <button
            type="button"
            onClick={() => {
              onNavigationItemClick(item);
            }}
            className={`flex w-full items-center justify-between py-2 rounded-[4px] text-[14px] md:hover:bg-white/10  transition-colors group px-1 ${
              !isMobile.value ? "" : ""
            } ${item.isExpandable ? "font-bold uppercase justify-start" : ""}`}
          >
            <div className="flex w-full h-full items-center gap-2">
              {item.icon && (
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/${item.icon}.png`}
                  className={`w-[24px] h-[24px] ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                  alt=""
                />
              )}

              <span className="flex flex-1 text-left text-[14px]">
                {item.name || ""}
              </span>
            </div>

            {item.hasArrow && (
              <>
                {item.isExpandable ? (
                  <img
                    src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                    className={`flex w-[24px] h-[24px] ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"} transition-all duration-300 ${
                      itemExpanded[item.id] ? " -rotate-90" : "rotate-90"
                    }`}
                    alt=""
                  />
                ) : (
                  <img
                    src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                    className={`flex w-[24px] h-[24px] transition-all duration-300 ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                    alt=""
                  />
                )}
              </>
            )}
          </button>

          {item.isExpandable && (
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                itemExpanded[item.id]
                  ? "max-h-[2000px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="flex flex-col gap-[2px] py-[2px]">
                {featuredLeagues.length === 0 ? (
                  <div className="flex items-center justify-center py-4 text-[12px] text-[var(--text-sub-color)]">
                    {tCommon("noDataAvailable")}
                  </div>
                ) : (
                  featuredLeagues.map((row: sidebarNode) => {
                    const leagueId =
                      row.type === "combined_league" ? row.id : row.leagueId;
                    const leagueName = row.name;
                    const regionName =
                      row.type === "combined_league"
                        ? "International"
                        : row.region?.name;
                    const sportId = row.sport?.id;
                    const sportName =
                      row.type === "combined_league"
                        ? "featured_leagues"
                        : row.sport?.name;
                    const path = buildPrematchPath(
                      sportName ?? "",
                      sportId ?? 0,
                      regionName ?? "",
                      row.region?.id ?? 0,
                      leagueName ?? "",
                      leagueId ?? "",
                    );
                    return (
                      <div
                        key={`featured-league-${leagueId}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          linkButtonOnClick(e, path, setLocation);
                          if (isMobile.value) isOpenedSidebar.value = false;
                        }}
                        className={`flex items-center text-[12px] justify-between pl-1 py-1 gap-[8px] rounded-[4px] bg-white/5 transition-colors w-full cursor-pointer ${!isMobile.value ? "hover:bg-white/10" : ""}`}
                      >
                        <img
                          src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${sportId}.svg`}
                          className={`w-[24px] h-[24px] shrink-0 ${baseTheme === "dark" ? "invert" : ""}`}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
                            e.currentTarget.className =
                              "w-[24px] h-[24px] shrink-0";
                          }}
                        />
                        <div className="flex flex-1 flex-col min-w-0">
                          <span className="flex-1 text-left text-[var(--text-primary-color)] truncate">
                            {leagueName}
                          </span>
                          {row.region ? (
                            <span className="text-[11px] text-[var(--text-sub-color)] truncate">
                              {row.region.name}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[var(--text-sub-color)]">
                              —
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
