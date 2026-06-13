import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import {
  buildPrematchPath,
  sportsbookHashHref,
} from "@/helpers/buildPrematchPath";
import { BASE_ASSET_PUBLIC_URL, getAppConfig } from "@/shared/config/appConfig";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { useMemo, useState } from "preact/hooks";
import type { sidebarNode } from "@/api/sidebar/apiGetSidebar";
import { getLeagueId, getRegionId } from "@/helpers/findSidebarNodeByRoute";
import { linkButtonOnClick } from "@/helpers/linkButtonClick";
import { useLocation } from "wouter-preact";

type Props = {
  sportNode?: sidebarNode;
  sportName: string;
  sportId: number;
};

const hasEvents = (node: sidebarNode): boolean =>
  (node.pre?.length ?? 0) +
    (node.live?.length ?? 0) +
    (node.outright?.length ?? 0) >
  0;

const isLeagueNode = (node: sidebarNode): boolean =>
  node.type === "league" || node.type === "combined_league";

const isRegionNode = (node: sidebarNode): boolean =>
  node.type === "region" || node.type === "combined_region";

const nodeLabel = (node: sidebarNode, lang: string): string => node.name || "";

const CompetitionsRender = ({ sportNode, sportName, sportId }: Props) => {
  const { baseColorTheme } = useSportsbookStore();
  const lang = getAppConfig().lang;
  const baseTheme = baseColorTheme.value;
  const [openContinents, setOpenContinents] = useState<Record<string, boolean>>(
    {},
  );
  const [openRegions, setOpenRegions] = useState<Record<string, boolean>>({});
  const [openAllCompetitions, setOpenAllCompetitions] = useState(true);

  const [, setLocation] = useLocation();

  const popularLeagues = useMemo(
    () =>
      (sportNode?.children ?? []).filter(
        (child) => isLeagueNode(child) && hasEvents(child),
      ),
    [sportNode],
  );

  const customRegions = useMemo(
    () =>
      (sportNode?.children ?? [])
        .filter((child) => child.type === "custom_region")
        .map((continent) => {
          const regions = (continent.children ?? [])
            .filter(isRegionNode)
            .map((region) => ({
              region,
              leagues: (region.children ?? []).filter(
                (child) => isLeagueNode(child) && hasEvents(child),
              ),
            }))
            .filter((item) => item.leagues.length > 0);

          const standaloneLeagues = (continent.children ?? []).filter(
            (child) => isLeagueNode(child) && hasEvents(child),
          );

          if (regions.length === 0 && standaloneLeagues.length === 0) {
            return null;
          }

          return { continent, regions, standaloneLeagues };
        })
        .filter((item): item is NonNullable<typeof item> => item != null),
    [sportNode, lang],
  );

  const allCompetitions = useMemo(() => {
    if (!sportNode || customRegions.length > 0) return null;

    const regions = (sportNode.children ?? [])
      .filter(isRegionNode)
      .map((region) => ({
        region,
        leagues: (region.children ?? []).filter(
          (child) => isLeagueNode(child) && hasEvents(child),
        ),
      }))
      .filter((item) => item.leagues.length > 0);

    const standaloneLeagues = (sportNode.children ?? []).filter(
      (child) => isLeagueNode(child) && hasEvents(child),
    );

    if (regions.length === 0 && standaloneLeagues.length === 0) return null;

    return { regions, standaloneLeagues };
  }, [sportNode, customRegions.length]);

  const toggleContinent = (id: string) => {
    setOpenContinents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleRegion = (id: string) => {
    setOpenRegions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const leagueHref = (
    regionName: string,
    regionId: string | number,
    leagueName: string,
    leagueId: string | number,
  ) =>
    sportsbookHashHref(
      buildPrematchPath(
        sportName,
        sportId,
        regionName,
        regionId,
        leagueName,
        leagueId,
      ),
    );

  const regionHref = (regionName: string, regionId: string | number) =>
    sportsbookHashHref(
      buildPrematchPath(sportName, sportId, regionName, regionId),
    );

  const standaloneLeagueHref = (league: sidebarNode) => {
    const leagueName = nodeLabel(league, lang);
    const leagueId = getLeagueId(league);
    return sportsbookHashHref(
      buildPrematchPath(sportName, sportId, leagueName, leagueId),
    );
  };

  if (!sportNode) {
    return (
      <div className="flex items-center justify-center w-full py-6 text-[12px] text-[var(--text-sub-color)]">
        No competitions available
      </div>
    );
  }

  if (
    popularLeagues.length === 0 &&
    customRegions.length === 0 &&
    !allCompetitions
  ) {
    return (
      <div className="flex items-center justify-center w-full py-6 text-[12px] text-[var(--text-sub-color)]">
        No competitions available
      </div>
    );
  }

  const chevronClass = (open: boolean) =>
    [
      "w-5 h-5 shrink-0 transition-transform duration-200 cursor-pointer",
      open ? "-rotate-90" : "rotate-90",
      baseTheme === "dark" ? "brightness-0 invert" : "brightness-0",
    ].join(" ");

  return (
    <>
      {allCompetitions ? (
        <div className="mb-4 break-inside-avoid p-4 rounded-lg bg-[var(--sub-element-secondary)]">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
            <p className="font-semibold text-[13px] uppercase tracking-wide">
              All Competitions
            </p>
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
              className={chevronClass(openAllCompetitions)}
              alt=""
              onClick={() => setOpenAllCompetitions((prev) => !prev)}
            />
          </div>

          {openAllCompetitions ? (
            <div className="flex flex-col gap-1">
              {allCompetitions.standaloneLeagues.map((league) => {
                const leagueName = nodeLabel(league, lang);
                return (
                  <a
                    key={league.id}
                    href={standaloneLeagueHref(league)}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg text-[13px] hover:bg-white/5 transition-colors"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <img
                        src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${sportId}.svg`}
                        className={`w-5 h-5 shrink-0 ${baseTheme === "dark" ? "invert" : ""}`}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.src =
                            getFlagIconFromregionName("International");
                          e.currentTarget.className =
                            "rounded-full w-4 h-4 object-cover";
                        }}
                      />
                      <span className="truncate">{leagueName}</span>
                    </span>
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                      className={chevronClass(false)}
                      alt=""
                    />
                  </a>
                );
              })}

              {allCompetitions.regions.map(({ region, leagues }) => {
                const regionLabel = nodeLabel(region, lang);
                const regionId = getRegionId(region);
                const isOpen = openRegions[region.id] ?? false;

                return (
                  <div key={region.id}>
                    <div className="flex items-center justify-between w-full p-2 rounded-lg text-[13px]">
                      <a
                        href={regionHref(regionLabel, regionId)}
                        className="flex items-center gap-2 min-w-0 hover:font-semibold transition-colors"
                      >
                        <img
                          src={getFlagIconFromregionName(regionLabel)}
                          className="w-5 h-5 rounded-full object-cover shrink-0"
                          alt={regionLabel}
                          onError={(e) => {
                            e.currentTarget.src =
                              getFlagIconFromregionName("International");
                          }}
                        />
                        <span className="truncate">{regionLabel}</span>
                      </a>
                      <img
                        src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                        className={chevronClass(isOpen)}
                        alt=""
                        onClick={() => toggleRegion(region.id)}
                      />
                    </div>

                    {isOpen ? (
                      <div className="ml-7 flex flex-col gap-0.5 pb-1">
                        {leagues.map((league) => {
                          const leagueName = nodeLabel(league, lang);
                          const leagueId = getLeagueId(league);

                          return (
                            <a
                              key={league.id}
                              href={leagueHref(
                                regionLabel,
                                regionId,
                                leagueName,
                                leagueId,
                              )}
                              className="p-2 rounded-lg text-[12px] hover:bg-white/5 hover:font-semibold transition-colors"
                            >
                              {leagueName}
                            </a>
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
      ) : (
        <div className="columns-1 md:columns-2 gap-4">
          {popularLeagues.length > 0 && customRegions.length > 0 && (
            <div className="mb-4 break-inside-avoid w-full">
              <p className="font-semibold uppercase text-[13px] mb-3 tracking-wide">
                Popular
              </p>
              <div className="grid w-full grid-cols-2 gap-2">
                {popularLeagues.map((league) => {
                  const leagueName = nodeLabel(league, lang);
                  const leagueId = getLeagueId(league);
                  const regionName = league.region?.name ?? "";
                  const regionId = league.region?.id ?? "";

                  return (
                    <button
                      key={league.id}
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
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--sub-element-secondary)] text-[13px] hover:bg-[var(--highlight-background)] transition-colors min-w-0"
                    >
                      <div className="flex items-center justify-center w-7 h-7 bg-white/90 rounded-[4px] shrink-0">
                        <img
                          src={`${BASE_ASSET_PUBLIC_URL}/logo/leagueById/${sportId}/${leagueId}.webp`}
                          className="w-5 h-5 object-contain"
                          alt=""
                          onError={(e) => {
                            e.currentTarget.src =
                              getFlagIconFromregionName(regionName);
                            e.currentTarget.className =
                              "rounded-full w-4 h-4 object-cover";
                          }}
                        />
                      </div>
                      <span className="truncate">{leagueName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {customRegions.map(({ continent, regions, standaloneLeagues }) => {
            const continentOpen = openContinents[continent.id] ?? true;
            const continentLabel = nodeLabel(continent, lang);

            return (
              <div
                key={continent.id}
                className="mb-4 break-inside-avoid p-4 rounded-lg bg-[var(--sub-element-secondary)]"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                  <p className="font-semibold text-[13px] uppercase tracking-wide">
                    {continentLabel}
                  </p>
                  <img
                    src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                    className={chevronClass(continentOpen)}
                    alt=""
                    onClick={() => toggleContinent(continent.id)}
                  />
                </div>

                {continentOpen ? (
                  <div className="flex flex-col gap-1">
                    {standaloneLeagues.map((league) => {
                      const leagueName = nodeLabel(league, lang);
                      return (
                        <a
                          key={league.id}
                          href={standaloneLeagueHref(league)}
                          className="flex items-center gap-2 p-2 rounded-lg text-[13px] hover:bg-white/5 transition-colors"
                        >
                          <img
                            src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${sportId}.svg`}
                            className={`w-5 h-5 ${baseTheme === "dark" ? "invert" : ""}`}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.src =
                                getFlagIconFromregionName("International");
                              e.currentTarget.className =
                                "rounded-full w-4 h-4 object-cover";
                            }}
                          />
                          <span>{leagueName}</span>
                        </a>
                      );
                    })}

                    {regions.map(({ region, leagues }) => {
                      const regionLabel = nodeLabel(region, lang);
                      const regionId = getRegionId(region);
                      const isOpen = openRegions[region.id] ?? false;

                      return (
                        <div key={region.id}>
                          <div className="flex items-center justify-between w-full p-2 rounded-lg text-[13px]">
                            <a
                              href={regionHref(regionLabel, regionId)}
                              className="flex items-center gap-2 min-w-0 hover:font-semibold transition-colors"
                            >
                              <img
                                src={getFlagIconFromregionName(regionLabel)}
                                className="w-5 h-5 rounded-full object-cover shrink-0"
                                alt={regionLabel}
                              />
                              <span className="truncate">{regionLabel}</span>
                            </a>
                            <img
                              src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                              className={chevronClass(isOpen)}
                              alt=""
                              onClick={() => toggleRegion(region.id)}
                            />
                          </div>

                          {isOpen ? (
                            <div className="ml-7 flex flex-col gap-0.5 pb-1">
                              {leagues.map((league) => {
                                const leagueName = nodeLabel(league, lang);
                                const leagueId = getLeagueId(league);

                                return (
                                  <a
                                    key={league.id}
                                    href={leagueHref(
                                      regionLabel,
                                      regionId,
                                      leagueName,
                                      leagueId,
                                    )}
                                    className="p-2 rounded-lg text-[12px] hover:bg-white/5 hover:font-semibold transition-colors"
                                  >
                                    {leagueName}
                                  </a>
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
    </>
  );
};

export default CompetitionsRender;
