import { FunctionComponent } from "preact";
import { useState, useMemo } from "preact/hooks";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { useLocation } from "wouter-preact";
import { isMobile } from "@/state/isMobile";
import {
  SpecialNavigationItem,
  useSpecialNavigationItems,
} from "@/hooks/useSpecialNavigationItems";
import { useRouteParams } from "@/hooks/useRotueParams";
import { summarySports } from "@/state/summarySports";
import type { SidebarFeaturedLeagueRow } from "@/state/summarySports";
import { useTranslate } from "@/shared/i18n/i18n";
import { isOpenedSidebar } from "@/state/isOpenedSidebar";
import { baseColorTheme } from "@/state/baseColorTheme";
import type { tSportResponse } from "@/api/sidebar/apiGetSummaryArray";

interface SpecialNavigationProps {}

/** Same segment rules as `PrematchSportsNavigation.buildPrematchPath`. */
function buildPrematchPath(
  sportName: string,
  sportId: number,
  regionName?: string,
  regionId?: number,
  leagueName?: string,
  leagueId?: number,
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

/** Build path from featured league tuple when API includes regionId/sportId. */
function prematchPathFromFeaturedRow(
  row: SidebarFeaturedLeagueRow,
  sportsData: tSportResponse,
): { path: string; sportName: string; regionName: string } | null {
  const leagueId = row[0];
  const leagueName = String(row[1] ?? "").trim();
  const regionId = row[4];
  const sportId = row[5];
  if (regionId == null || sportId == null || !leagueName) {
    return prematchPathForFeaturedLeague(sportsData, leagueId);
  }
  const sport = sportsData.find((s) => s[0] === sportId);
  const sportName = sport ? String(sport[1] ?? "").trim() : "";
  if (!sportName) return prematchPathForFeaturedLeague(sportsData, leagueId);
  let regionName = "";
  for (const region of sport[2] ?? []) {
    if (region[0] === regionId) {
      regionName = String(region[1] ?? "").trim();
      break;
    }
  }
  return {
    path: buildPrematchPath(
      sportName,
      sportId,
      regionName,
      regionId,
      leagueName,
      leagueId,
    ),
    sportName,
    regionName,
  };
}

/** Resolve sport/region for a featured league id using the prematch summary tree. */
function prematchPathForFeaturedLeague(
  sportsData: tSportResponse,
  leagueId: number,
): { path: string; sportName: string; regionName: string } | null {
  for (const sport of sportsData ?? []) {
    const sportId = sport[0] as number;
    const sportName = String(sport[1] ?? "").trim();
    if (!sportName) continue;
    for (const region of sport[2] ?? []) {
      const regionId = region[0] as number;
      const regionName = String(region[1] ?? "").trim();
      for (const league of region[2] ?? []) {
        const id = league[0] as number;
        if (id !== leagueId) continue;
        const leagueName = String(league[1] ?? "").trim();
        return {
          path: buildPrematchPath(
            sportName,
            sportId,
            regionName,
            regionId,
            leagueName,
            leagueId,
          ),
          sportName,
          regionName,
        };
      }
    }
  }
  return null;
}

export const SpecialNavigation: FunctionComponent<
  SpecialNavigationProps
> = () => {
  const [, setLocation] = useLocation();
  const { sportName } = useRouteParams();
  const { t: tCommon } = useTranslate("common");
  const baseTheme = baseColorTheme.value;

  const featuredLeagues = useMemo(
    () => summarySports.value.featuredLeagues ?? [],
    [summarySports.value],
  );

  const LinkButtonOnClick = (e: MouseEvent, path: string) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      const fullUrl = `${window.location.origin}${window.location.pathname}#sportsbook=${path}`;
      window.open(fullUrl, "_blank");
    } else {
      setLocation(path);
    }
  };

  const [itemExpanded, setItemExpanded] = useState<Record<string, boolean>>({});
  const navigationItems = useSpecialNavigationItems();

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
          key={item.id}
          className={`${item.id === "competitions" ? "hidden md:flex" : ""} flex flex-col w-full rounded-[4px] overflow-hidden ${
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

              <span className="hidden md:flex flex-1 text-left text-[14px]">
                {item.name || ""}
              </span>
            </div>

            {item.hasArrow && (
              <>
                {item.isExpandable ? (
                  <img
                    src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                    className={`hidden md:flex w-[24px] h-[24px] ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"} transition-all duration-300 ${
                      itemExpanded[item.id] ? " -rotate-90" : "rotate-90"
                    }`}
                    alt=""
                  />
                ) : (
                  <img
                    src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                    className={`hidden md:flex w-[24px] h-[24px] transition-all duration-300 ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
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
                  featuredLeagues.map((row: SidebarFeaturedLeagueRow) => {
                    const leagueId = row[0];
                    const leagueName = String(row[1] ?? "");
                    const resolved = prematchPathFromFeaturedRow(
                      row,
                      summarySports.value.data ?? [],
                    );
                    const sportIcon = resolved?.sportName ?? "all-sports";
                    return (
                      <div
                        key={`featured-league-${leagueId}`}
                        onClick={(e) => {
                          if (!resolved) return;
                          LinkButtonOnClick(e, resolved.path);
                          if (isMobile.value) isOpenedSidebar.value = false;
                        }}
                        className={`flex items-center text-[12px] justify-between pl-1 py-1 gap-[8px] rounded-[4px] bg-white/5 transition-colors w-full ${
                          resolved
                            ? `cursor-pointer ${!isMobile.value ? "hover:bg-white/10" : ""}`
                            : "opacity-60 cursor-default"
                        }`}
                      >
                        <img
                          src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportsicons/${sportIcon}.png`}
                          onError={(e) => {
                            e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/icons/all-sports.png`;
                          }}
                          className={`w-[24px] h-[24px] shrink-0 ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                          alt=""
                        />
                        <div className="flex flex-1 flex-col min-w-0">
                          <span className="flex-1 text-left text-[var(--text-primary-color)] truncate">
                            {leagueName}
                          </span>
                          {resolved ? (
                            <span className="text-[11px] text-[var(--text-sub-color)] truncate">
                              {resolved.regionName}
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
