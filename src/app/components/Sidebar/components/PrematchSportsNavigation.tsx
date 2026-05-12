import { FunctionComponent } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { useLocation } from "wouter-preact";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { linkButtonOnClick } from "@/helpers/linkButtonClick";
import { useRouteParams } from "@/hooks/useRotueParams";
import { useTranslate } from "@/shared/i18n/i18n";
import { translationState } from "@/state/translationState";
import { baseColorTheme } from "@/state/baseColorTheme";
import { summarySports } from "@/state/summarySports";

type SportRow = (typeof summarySports.value.data)[number];
type RegionRow = SportRow[2][number];
type LeagueRow = RegionRow[2][number];

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

function k(...parts: (string | number)[]) {
  return parts.join(":");
}

export const PrematchSportsNavigation: FunctionComponent = () => {
  const { t: tCommon } = useTranslate("common");
  const { t: tAlt } = useTranslate("alt");
  const baseTheme = baseColorTheme.value;
  const [, setLocation] = useLocation();
  const { sportIdParam, regionIdParam } = useRouteParams();

  const [isNavExpanded, setIsNavExpanded] = useState<boolean>(true);
  const [expandedSports, setExpandedSports] = useState<Set<number>>(
    () => new Set(),
  );
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(
    () => new Set(),
  );

  const sports = useMemo(
    () => summarySports.value.data ?? [],
    [summarySports.value.data],
  );

  useEffect(() => {
    const spId = Number(sportIdParam);
    if (Number.isFinite(spId) && spId > 0) {
      setExpandedSports((prev) => new Set([...prev, spId]));
    }
    const rgId = Number(regionIdParam);
    if (
      Number.isFinite(spId) &&
      spId > 0 &&
      Number.isFinite(rgId) &&
      rgId > 0
    ) {
      setExpandedRegions((prev) => new Set([...prev, k(spId, rgId)]));
    }
  }, [sportIdParam, regionIdParam]);

  const toggleSport = (sportId: number) => {
    setExpandedSports((prev) => {
      const next = new Set(prev);
      if (next.has(sportId)) next.delete(sportId);
      else next.add(sportId);
      return next;
    });
  };

  const toggleRegion = (sportId: number, regionId: number) => {
    const key = k(sportId, regionId);
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex flex-col w-full gap-2 md:gap-[2px] text-[var(--text-basic-color)] rounded-[4px]">
      <div className="w-full h-px bg-[var(--border-color)]" />
      <button
        type="button"
        className="hidden md:flex text-[14px] uppercase font-bold py-2 pl-2 pr-1 rounded-[4px] md:hover:bg-white/10 items-center justify-between"
        onClick={() => setIsNavExpanded((prev) => !prev)}
        aria-expanded={isNavExpanded}
      >
        <span>{tCommon("sports")}</span>
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
          className={`w-[26px] inline-block ml-1 transition-all duration-300 ${isNavExpanded ? "-rotate-90" : "rotate-90"}`}
          alt={tAlt("arrowRight")}
        />
      </button>

      {!isNavExpanded ? null : sports.length === 0 ? (
        <div className="py-2 pl-1">{tCommon("noDataAvailable")}</div>
      ) : (
        <div className="flex flex-col w-full gap-[2px] rounded-[4px]">
          {sports.map((sport) => {
            const sportId = sport[0] as number;
            const sportName = String(sport[1] ?? "");
            const regions = (sport[2] ?? []) as RegionRow[];

            const sportCount =
              summarySports.value.counts?.[sportId]?.total ?? 0;
            if (sportCount <= 0) return null;

            const isSportExpanded = expandedSports.has(sportId);

            const sportLabel =
              translationState.value.translations[sportName] || sportName;

            return (
              <div
                key={k("s", sportId)}
                className="flex flex-col rounded-[4px]"
                style={{ order: sportId }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    // click = expand/collapse sport (and also navigate to sport level)
                    toggleSport(sportId);
                    // linkButtonOnClick(
                    //   e,
                    //   buildPrematchPath(sportName, sportId),
                    //   setLocation,
                    // );
                  }}
                  className="flex justify-between gap-2 items-center pl-1 py-2 px-1 font-medium transition-colors md:hover:bg-white/10 md:hover:text-[var(--text-primary-color)]"
                >
                  <div className="flex gap-[10px] flex-1 min-w-0 items-center">
                    <div className="w-[24px] h-full shrink-0">
                      <img
                        src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportsicons/${sportName}.png`}
                        onError={(ev) => {
                          ev.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/icons/all-sports.png`;
                        }}
                        className={`w-[24px] h-[24px] ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                        alt=""
                      />
                    </div>
                    <span className="hidden md:flex flex-1 text-left break-words whitespace-normal text-[14px]">
                      {sportLabel}
                    </span>
                  </div>
                  <div className="hidden md:flex items-center gap-2 shrink-0">
                    <span className="text-[12px] opacity-80">{sportCount}</span>
                    <img
                      className={`w-[24px] hidden md:flex rounded-[4px] h-[24px] transition-all shrink-0 ${isSportExpanded ? "-rotate-90" : "rotate-90"} ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                      src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                      alt=""
                      onClick={(ev) => {
                        ev.stopPropagation();
                        toggleSport(sportId);
                      }}
                    />
                  </div>
                </button>

                {isSportExpanded ? (
                  <div className="hidden md:flex flex-col rounded-md bg-white/5 gap-0 overflow-hidden">
                    {regions.map((region) => {
                      const regionId = region[0] as number;
                      const regionName = String(region[1] ?? "");
                      const leagues = (region[2] ?? []) as LeagueRow[];

                      const regionCount =
                        summarySports.value.counts?.[sportId]?.regions?.[
                          regionId
                        ]?.total ?? 0;
                      if (regionCount <= 0) return null;

                      const regionKey = k(sportId, regionId);
                      const isRegionExpanded = expandedRegions.has(regionKey);

                      const regionLabel =
                        translationState.value.translations[regionName] ||
                        regionName;

                      return (
                        <div
                          key={k("r", sportId, regionId)}
                          className="flex flex-col"
                          style={{ order: regionId }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              toggleRegion(sportId, regionId);
                              linkButtonOnClick(
                                e,
                                buildPrematchPath(
                                  sportName,
                                  sportId,
                                  regionName,
                                  regionId,
                                ),
                                setLocation,
                              );
                            }}
                            style={{ paddingLeft: 18 }}
                            className="flex justify-between gap-2 items-center py-2 px-1 font-medium transition-colors md:hover:bg-white/10 md:hover:text-[var(--text-primary-color)]"
                          >
                            <span className="hidden md:flex flex-1 text-left break-words whitespace-normal text-[14px]">
                              {regionLabel}
                            </span>
                            <div className="hidden md:flex items-center gap-2 shrink-0">
                              <span className="text-[12px] opacity-80">
                                {regionCount}
                              </span>
                              <img
                                className={`w-[24px] hidden md:flex rounded-[4px] h-[24px] transition-all shrink-0 ${isRegionExpanded ? "-rotate-90" : "rotate-90"} ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                                src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                                alt=""
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  toggleRegion(sportId, regionId);
                                }}
                              />
                            </div>
                          </button>

                          {isRegionExpanded ? (
                            <div className="flex flex-col">
                              {leagues.map((league) => {
                                const leagueId = league[0] as number;
                                const leagueName = String(league[1] ?? "");
                                const leagueCount =
                                  summarySports.value.counts?.[sportId]
                                    ?.regions?.[regionId]?.leagues?.[
                                    leagueId
                                  ] ?? 0;
                                if (leagueCount <= 0) return null;

                                const leagueLabel =
                                  translationState.value.translations[
                                    leagueName
                                  ] || leagueName;

                                return (
                                  <button
                                    key={k("l", sportId, regionId, leagueId)}
                                    type="button"
                                    onClick={(e) => {
                                      linkButtonOnClick(
                                        e,
                                        buildPrematchPath(
                                          sportName,
                                          sportId,
                                          regionName,
                                          regionId,
                                          leagueName,
                                          leagueId,
                                        ),
                                        setLocation,
                                      );
                                    }}
                                    style={{ paddingLeft: 30, order: leagueId }}
                                    className="flex justify-between gap-2 items-start py-2 pl-1 pr-3 font-medium transition-colors md:hover:bg-white/10 md:hover:text-[var(--text-primary-color)]"
                                  >
                                    <span className="hidden md:flex flex-1 text-left break-words whitespace-normal text-[12px]">
                                      {leagueLabel}
                                    </span>
                                    <span className="hidden md:flex text-[12px] opacity-80 shrink-0">
                                      {leagueCount}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
