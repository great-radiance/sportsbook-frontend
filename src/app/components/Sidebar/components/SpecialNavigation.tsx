import { FunctionComponent } from "preact";
import { useState, useEffect, useMemo } from "preact/hooks";
import { BASE_ASSET_PUBLIC_URL, getAppConfig } from "@/shared/config/appConfig";
import { useLocation } from "wouter-preact";
import { isMobile } from "@/state/isMobile";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import {
  SpecialNavigationItem,
  useSpecialNavigationItems,
} from "@/hooks/useSpecialNavigationItems";
import { apiGetFeaturedLeagues } from "@/api/special-matches/apiGetFeaturedLeagues";
import { popularLeaguesState } from "@/state/popularLeaguesState";
import { useRouteParams } from "@/hooks/useRotueParams";
import { summarySports } from "@/state/summarySports";
import { useTranslate } from "@/shared/i18n/i18n";
import { isOpenedSidebar } from "@/state/isOpenedSidebar";
import { getTranslate, getTranslatedText } from "@/helpers/getTranslate";
import { baseColorTheme } from "@/state/baseColorTheme";

interface SpecialNavigationProps {}

export const SpecialNavigation: FunctionComponent<
  SpecialNavigationProps
> = () => {
  const [, setLocation] = useLocation();
  const { sportName } = useRouteParams();
  const { t: tCommon } = useTranslate("common");
  const baseTheme = baseColorTheme.value;

  const LinkButtonOnClick = (e: MouseEvent, path: string) => {
    e.stopPropagation();
    // Check if Control (Windows/Linux) or Cmd (Mac) is pressed
    if (e.ctrlKey || e.metaKey) {
      // Open in new tab with hash-based URL
      const fullUrl = `${window.location.origin}${window.location.pathname}#sportsbook=${path}`;
      window.open(fullUrl, "_blank");
    } else {
      // Normal navigation in same tab
      setLocation(path);
    }
  };

  // const { getRegionNameById } = useRegionCompetition();
  const [loading, setLoading] = useState<boolean>(false);
  const [itemExpanded, setItemExpanded] = useState<Record<string, boolean>>({});
  const navigationItems = useSpecialNavigationItems();

  useEffect(() => {
    const fetchPopularCompetitions = async () => {
      if (
        Object.keys(popularLeaguesState.value).length !== 0 ||
        Object.keys(summarySports.value).length === 0
      )
        return;
      try {
        setLoading(true);
        const response = await apiGetFeaturedLeagues();
        popularLeaguesState.value = response;
        if (getAppConfig().lang !== "en") {
          const sourceTexts: string[] = [];
          for (const sport of Object.keys(response)) {
            sourceTexts.push(sport);
            for (const region of Object.keys(response[sport] ?? {})) {
              sourceTexts.push(region);
              for (const league of response[sport][region] ?? []) {
                sourceTexts.push(league);
              }
            }
          }
          getTranslate([...new Set(sourceTexts)]);
        }
      } catch (error) {
        console.error("Error fetching popular competitions:", error);
        popularLeaguesState.value = {};
      } finally {
        setLoading(false);
      }
    };
    fetchPopularCompetitions();
  }, [summarySports.value]);

  const onNavigationItemClick = (item: SpecialNavigationItem) => {
    if (item.isExpandable) {
      setItemExpanded((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
    } else {
      if (isMobile.value) {
        isOpenedSidebar.value = false;
      }
      setLocation(`/event-view/special/${item.id}`);
    }
  };

  return (
    <div className="flex flex-col w-full text-[var(--text-basic-color)] rounded-[4px]">
      {navigationItems.map((item) => (
        <div
          className={`${item.id === "competitions" ? "hidden lg:block" : ""} flex flex-col w-full rounded-[4px] overflow-hidden ${
            item.id === sportName ? "font-bold" : ""
          }`}
          style={
            item.id === sportName
              ? { background: "var(--selected-item-color)" }
              : undefined
          }
        >
          <button
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
                />
              )}

              <span className="hidden lg:block flex-1 text-left text-[14px]">
                {item.name || ""}
              </span>
            </div>

            {item.hasArrow && (
              <>
                {item.isExpandable ? (
                  <img
                    src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                    className={`hidden lg:block w-[24px] h-[24px] ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"} transition-all duration-300 ${
                      itemExpanded[item.id] ? " -rotate-90" : "rotate-90"
                    }`}
                  />
                ) : (
                  <img
                    src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                    className={`hidden lg:block w-[24px] h-[24px] transition-all duration-300 ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
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
                {loading ? (
                  <div className="flex items-center justify-center py-4 text-[12px]">
                    {tCommon("loading")}
                  </div>
                ) : (
                  // popularLeaguesState.value.map((league: tPopularLeague) => (
                  //   <div
                  //     onClick={(e) => {
                  //       LinkButtonOnClick(
                  //         e,
                  //         `/event-view/pre-match/${league.sportName}/${league.regionSlug}/${league.leagueSlug}`,
                  //       );
                  //     }}
                  //     className={`flex items-center text-[12px] cursor-pointer justify-between pl-1 py-1 gap-[8px] rounded-[4px] bg-white/5 transition-colors w-full ${
                  //       !isMobile.value ? "hover:bg-black/5" : ""
                  //     }`}
                  //   >
                  //     <img
                  //       src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportsicons/${league.sportName}.png`}
                  //       className="w-[16px] h-full grayscale-100 invert"
                  //     />
                  //     <div className="flex flex-1 flex-col">
                  //       <span className="flex-1 text-left text-[var(--text-blue)]">
                  //         {league.leagueName}
                  //       </span>
                  //       <span>{league.regionName}</span>
                  //     </div>
                  //     {/* <input
                  //       type="checkbox"
                  //       className="w-[16px] h-[16px] accent-[var(--primary-color)]"
                  //     /> */}
                  //   </div>
                  // ))
                  <>
                    {Object.keys(popularLeaguesState.value).flatMap(
                      (sport: string) =>
                        Object.keys(popularLeaguesState.value[sport]).flatMap(
                          (region: string) =>
                            Object.values(
                              popularLeaguesState.value[sport][region],
                            ).map((league: string) => {
                              if (
                                !summarySports.value.counts[sport]?.regions?.[
                                  region
                                ]?.leagues?.[league]
                              )
                                return null;
                              return (
                                <div
                                  key={`special-${sport}-${region}-${league}`}
                                  onClick={(e) => {
                                    LinkButtonOnClick(
                                      e,
                                      `/event-view/pre-match/${sport}/${region}/${league}`,
                                    );
                                  }}
                                  className={`flex items-center text-[12px] cursor-pointer justify-between pl-1 py-1 gap-[8px] rounded-[4px] bg-white/5 transition-colors w-full ${
                                    !isMobile.value ? "hover:bg-white/10" : ""
                                  }`}
                                >
                                  <img
                                    src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportsicons/${sport}.png`}
                                    className={`w-[24px] ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                                  />
                                  <div className="flex flex-1 flex-col">
                                    <span className="flex-1 text-left text-[var(--text-primary-color)]">
                                      {getTranslatedText(league)}
                                    </span>
                                    {getTranslatedText(region)}
                                  </div>
                                  {/* <input
                        type="checkbox"
                        className="w-[16px] h-[16px] accent-[var(--primary-color)]"
                      /> */}
                                </div>
                              );
                            }),
                        ),
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
