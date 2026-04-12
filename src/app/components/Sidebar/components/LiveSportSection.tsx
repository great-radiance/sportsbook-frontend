import { FunctionComponent } from "preact";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { isMobile } from "@/state/isMobile";
import { MiniMatch } from "@/app/components/MatchesBoard/components/Match/MiniMatch";
import { useState, useEffect, useRef } from "preact/hooks";
import { summarySportsLive } from "@/state/summarySports";
import { orderConfigState } from "@/state/orderConfigState";
import { useRouteParams } from "@/hooks/useRotueParams";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { useTranslate } from "@/shared/i18n/i18n";
import { apiGetMatches } from "@/api/matches/apiGetMatches";
import { storeState } from "@/state/storeState";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { computed } from "@preact/signals";
import { MiniMatchLoader } from "../../Loading";
import { liveScrollPos } from "@/state/liveScrollPos";
import { getTranslatedText } from "@/helpers/getTranslate";
import { baseColorTheme } from "@/state/baseColorTheme";
import { convertAndStoreEvent } from "@/helpers/convertAndStoreEvent";

interface LiveSportSectionProps {
  selectedSportName: string;
  isExpanded?: boolean;
  toggleSport?: (sportSlug: string) => void;
  groupByRegions: boolean;
}

export const LiveSportSection: FunctionComponent<LiveSportSectionProps> = ({
  isExpanded = false,
  toggleSport,
  groupByRegions,
  selectedSportName,
}) => {
  const baseTheme = baseColorTheme.value;
  const { t: tCommon } = useTranslate("common");
  const { sportName } = useRouteParams();
  const sport = computed(
    () => summarySportsLive.value.data?.[selectedSportName] || {},
  );
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(
    new Set([]),
  );
  const [unExpandedLeagues, setUnExpandedLeagues] = useState<Set<string>>(
    new Set([]),
  );
  const { regionName, leagueName, eventId } = useRouteParams();
  const [loadingMatches, setLoadingMatches] = useState<boolean>(true);
  const pendingDeleteRef = useRef<number[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  // Horizontal tablist scroll controls
  const navRef = useRef<HTMLDivElement>(null);
  const [leftDisabled, setLeftDisabled] = useState(true);
  const [rightDisabled, setRightDisabled] = useState(false);

  const updateNavButtons = () => {
    const el = navRef.current;
    if (!el) return;
    setLeftDisabled(el.scrollLeft <= 0);
    setRightDisabled(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };

  const scrollNav = (direction: number) => {
    const el = navRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.6, 120);
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  useEffect(() => {
    updateNavButtons();
    const el = navRef.current;
    if (!el) return;
    const onScroll = () => updateNavButtons();
    window.addEventListener("resize", updateNavButtons);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", updateNavButtons);
      el.removeEventListener("scroll", onScroll as any);
    };
  }, [selectedMarkets]);

  useEffect(() => {
    pendingDeleteRef.current = [];
    if (!isExpanded || !sportName || !loadedSidebarState.value) {
      setLoadingMatches(false);
      return;
    }
    (async () => {
      setLoadingMatches(true);
      const promises = Object.keys(
        summarySportsLive.value.data?.[selectedSportName] || {},
      ).flatMap((r) => {
        const eventIds = Object.keys(
          summarySportsLive.value.data?.[selectedSportName]?.[r] || {},
        ).flatMap((l) =>
          Object.values(
            summarySportsLive.value?.data?.[selectedSportName]?.[r]?.[l] || {},
          ).map((m) => m[0] as number),
        );
        pendingDeleteRef.current.push(...eventIds);
        if (eventIds.length === 0) {
          return [];
        }
        return apiGetMatches(eventIds, "InPlay", selectedSportName);
      });

      try {
        setLoadingMatches(true);
        const results = await Promise.allSettled(promises);
        results.forEach((result) => {
          if (result.status === "rejected") {
            console.error(
              "Error fetching one live matches batch:",
              result.reason,
            );
            return;
          }
          const res = result.value;
          const newEvents = res.data?.sort((a, b) => (a[9] ?? 0) - (b[9] ?? 0));
          convertAndStoreEvent(newEvents);
          setSelectedMarkets(res.marketsMeta);
        });
      } catch (error) {
        console.error("Error fetching live matches:", error);
      } finally {
        setLoadingMatches(false);
      }
    })();
    return () => {
      // Clear pending deletes on unmount or when sport changes
      pendingDeleteRef.current.forEach((id) => {
        if (parseInt(eventId ?? "0") === id) return;
        delete storeState.value[id];
      });
      pendingDeleteRef.current = [];
    };
  }, [isExpanded, loadedSidebarState.value]);

  useEffect(() => {
    if (groupByRegions) {
      setUnExpandedLeagues(new Set([]));
    }
  }, [groupByRegions]);

  useEffect(() => {
    if (regionName) {
      setExpandedRegions((prev) => {
        const newSet = new Set(prev);
        newSet.add(regionName);
        return newSet;
      });
    }
    if (leagueName) {
      setUnExpandedLeagues((prev) => {
        const newSet = new Set(prev);
        newSet.delete(leagueName);
        return newSet;
      });
    }
  }, [regionName, leagueName]);

  const toggleRegion = (regionName: string) => {
    setExpandedRegions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(regionName)) {
        newSet.delete(regionName);
      } else {
        newSet.add(regionName);
      }
      return newSet;
    });
  };

  const toggleLeague = (leagueName: string) => {
    setUnExpandedLeagues((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leagueName)) {
        newSet.delete(leagueName);
      } else {
        newSet.add(leagueName);
      }
      return newSet;
    });
  };

  return (
    <div className={`flex w-full gap-2 flex-col`}>
      {/* Sport Item */}
      {!isMobile.value && (
        <button
          onClick={() => toggleSport?.(selectedSportName || "")}
          className={`flex items-center justify-between px-[5px] py-2  rounded-[4px] text-[var(--text-basic-color)] font-medium transition-colors ${!isMobile.value ? "hover:" : ""}`}
        >
          <div className="flex items-center gap-2 flex-1">
            <div className="w-[20px] h-full text-[16px]">
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportsicons/${selectedSportName}.png`}
                onError={(e) => {
                  e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/icons/all-sports.png`;
                }}
                alt={selectedSportName}
                className={`w-[20px] h-[20px] ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
              />
            </div>
            <span className="flex-1 text-left">{selectedSportName}</span>
            {<span className="pr-[10px]">{sport.value?.matchCount}</span>}
          </div>
          <img
            className={`w-[24px] rounded-[4px] h-[24px] transition-all duration-300 ${
              isExpanded ? "-rotate-90" : "rotate-90"
            } ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
            src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
            alt="arrow-right"
          />
        </button>
      )}

      {isExpanded ? (
        loadingMatches ? (
          <div className="flex flex-col mt-1 rounded-[4px]">
            {Array.from({ length: 3 }).map((_, index) => (
              <MiniMatchLoader key={index} />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden gap-2 transition-all duration-300 ease-in-out">
            <div className="flex flex-col mt-1 rounded-[4px]">
              {Object.keys(sport.value).length === 0 ? (
                <div className="px-2 py-2 text-[var(--text-sub-color)] ">
                  {tCommon("noDataAvailable")}
                </div>
              ) : (
                // Original flat structure (region-competition combined)
                Object.keys(sport.value)
                  ?.map((region) => {
                    const flagIcon = getFlagIconFromregionName(region || "");
                    if (
                      summarySportsLive.value.counts[selectedSportName]
                        ?.regions?.[region]?.total === 0 ||
                      orderConfigState.value[selectedSportName]?.regions?.[
                        region
                      ]?.enabled === false
                    )
                      return null;
                    return (
                      <div
                        key={region}
                        style={{
                          order:
                            orderConfigState.value[selectedSportName]
                              ?.regions?.[region]?.order || 999,
                        }}
                      >
                        {Object.keys(sport.value[region]).map((league) => {
                          if (
                            summarySportsLive.value.counts[selectedSportName]
                              ?.regions?.[region]?.leagues?.[league] === 0 ||
                            orderConfigState.value[selectedSportName]
                              ?.regions?.[region]?.leagues?.[league]
                              ?.enabled === false
                          )
                            return null;
                          const eventIds = Object.values(
                            sport.value[region]?.[league] || {},
                          ).map((match) => match[0]);
                          const existingEventIds = Object.keys(
                            storeState.value,
                          ).filter((id) => eventIds.includes(parseInt(id)));
                          if (existingEventIds.length === 0) return null;

                          return (
                            <div
                              key={`${region}-${league || ""}`}
                              className={`flex flex-col px-[5px] ${!unExpandedLeagues.has(league || "") ? "pb-[5px]" : ""}`}
                              style={{
                                // display: orderConfigState.value[selectedSportName]
                                //   ?.regions?.[region]?.leagues?.[league]?.enabled
                                //   ? "flex"
                                //   : "none",
                                order:
                                  orderConfigState.value[selectedSportName]
                                    ?.regions?.[region]?.leagues?.[league]
                                    ?.order || 999,
                              }}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRegion(region || "");
                                  toggleLeague(league || "");
                                }}
                                className={`flex items-center h-[36px] justify-between px-2 pt-2 pb-1 rounded-[4px]  transition-colors w-full`}
                              >
                                <div className="flex items-center gap-[10px] min-w-0">
                                  {flagIcon ? (
                                    <img
                                      src={flagIcon}
                                      alt={region || ""}
                                      className="w-[16px] h-[16px] rounded-full shrink-0"
                                    />
                                  ) : (
                                    <div className="w-[18px] h-[12px] shrink-0" />
                                  )}
                                  <span className="flex-1 text-left truncate min-w-0">
                                    {getTranslatedText(region || "")}{" "}
                                    {getTranslatedText(league || "")}{" "}
                                    {/* {
                                    summarySportsLive.value.counts[
                                      selectedSportName
                                    ]?.regions?.[region]?.leagues?.[league]
                                  } */}
                                  </span>
                                  {/* <span className="text-white/60 pr-[10px] shrink-0">
                              {league.matchCount || 0}
                            </span> */}
                                </div>
                                <img
                                  className={`w-[24px] rounded-[4px] h-[24px] transition-all duration-300 ${
                                    !unExpandedLeagues.has(league || "")
                                      ? "-rotate-90"
                                      : "rotate-90"
                                  } ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                                  src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                                  alt="arrow-right"
                                />
                              </button>

                              {!unExpandedLeagues.has(league || "") && (
                                <div className="overflow-hidden transition-all duration-300 ease-in-out">
                                  <div className="flex flex-col w-full h-full gap-2 rounded-[4px]">
                                    {(summarySportsLive.value?.counts[
                                      selectedSportName
                                    ]?.regions?.[region]?.leagues?.[league] ||
                                      0) > 0 ? (
                                      Object.values(
                                        sport.value[region]?.[league] || {},
                                      ).map((match) => {
                                        const isSelectedMatch =
                                          match[0] === parseInt(eventId ?? "0");
                                        return (
                                          <div
                                            key={match[0]}
                                            ref={(el) => {
                                              if (el && isSelectedMatch) {
                                                const scrollParent = el.closest(
                                                  "[class*='overflow-y-auto']",
                                                ) as HTMLElement | null;
                                                if (scrollParent) {
                                                  liveScrollPos.value =
                                                    el.getBoundingClientRect()
                                                      .top -
                                                    scrollParent.getBoundingClientRect()
                                                      .top +
                                                    scrollParent.scrollTop;
                                                } else {
                                                  liveScrollPos.value =
                                                    el.offsetTop;
                                                }
                                              }
                                            }}
                                          >
                                            <MiniMatch
                                              selectedEventId={match[0]}
                                              marketSlug={"match-result"}
                                              loading={loadingMatches}
                                            />
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div className="px-2 py-2 text-[var(--text-sub-color)] text-[12px]">
                                        No matches available
                                        {
                                          summarySportsLive.value.counts[
                                            selectedSportName
                                          ]?.regions?.[region]?.leagues?.[
                                            league
                                          ]
                                        }
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                  .flat()
              )}
            </div>
          </div>
        )
      ) : null}
    </div>
  );
};
