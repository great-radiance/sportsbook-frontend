import { FunctionComponent } from "preact";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { isMobile } from "@/state/isMobile";
import { MiniMatch } from "@/app/components/MatchesBoard/components/Match/MiniMatch";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useRouteParams } from "@/hooks/useRotueParams";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { useTranslate } from "@/shared/i18n/i18n";
import { apiGetMatches } from "@/api/matches/apiGetMatchesByNode";
import { storeEvent } from "@/helpers/storeEvent";
import { storeState } from "@/state/storeState";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { MiniMatchLoader } from "../../Loading";
import { liveScrollPos } from "@/state/liveScrollPos";
import { baseColorTheme } from "@/state/baseColorTheme";

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
  const { sportName, regionName, leagueName, eventId } = useRouteParams();

  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(
    new Set([]),
  );
  const [unExpandedLeagues, setUnExpandedLeagues] = useState<Set<string>>(
    new Set([]),
  );
  const [loadingMatches, setLoadingMatches] = useState<boolean>(true);
  const pendingDeleteRef = useRef<number[]>([]);

  return null;

  // Find the sport tuple by name. `summarySportsLive.value.data` is now a
  // `tSportResponse` tuple array — `[sportId, sportName, regions[]]`.
  const sportTuple = useMemo(
    () =>
      summarySportsLive.value.data?.find((s) => s[1] === selectedSportName) ??
      null,
    [summarySportsLive.value.data, selectedSportName],
  );
  const sportId = sportTuple?.[0];
  const regions = sportTuple?.[2] ?? [];
  const matchCount =
    sportId != null ? (summarySportsLive.value.counts[sportId]?.total ?? 0) : 0;

  useEffect(() => {
    pendingDeleteRef.current = [];
    if (!isExpanded || !sportName || !loadedSidebarState.value) {
      setLoadingMatches(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoadingMatches(true);
        const eventIds: number[] = [];
        for (const region of regions) {
          for (const league of region[2] ?? []) {
            for (const id of league[2] ?? []) {
              if (typeof id === "number") {
                eventIds.push(id);
                pendingDeleteRef.current.push(id);
              }
            }
          }
        }
        if (eventIds.length === 0) {
          if (!cancelled) setLoadingMatches(false);
          return;
        }
        const events = await apiGetMatches(eventIds);
        if (cancelled) return;
        const sorted = (events ?? []).sort(
          (a, b) =>
            new Date(b.eventInfo.startTime).getTime() -
            new Date(a.eventInfo.startTime).getTime(),
        );
        sorted.forEach((e) => storeEvent(e));
      } catch (err) {
        console.error("Error fetching live matches:", err);
      } finally {
        if (!cancelled) setLoadingMatches(false);
      }
    })();

    return () => {
      cancelled = true;
      // Don't evict the event the user is currently viewing on the
      // markets/event-view page.
      const currentEventId = parseInt(eventId ?? "0");
      pendingDeleteRef.current.forEach((id) => {
        if (id === currentEventId) return;
        delete storeState.value[id];
      });
      pendingDeleteRef.current = [];
    };
  }, [isExpanded, loadedSidebarState.value, regions]);

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

  const toggleRegion = (name: string) => {
    setExpandedRegions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      return newSet;
    });
  };

  const toggleLeague = (name: string) => {
    setUnExpandedLeagues((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
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
                src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${sportId}.svg`}
                onError={(e) => {
                  e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
                }}
                alt={selectedSportName}
                className={`w-[20px] h-[20px] ${baseTheme === "dark" ? "invert" : ""}`}
              />
            </div>
            <span className="flex-1 text-left">{selectedSportName}</span>
            <span className="pr-[10px]">{matchCount}</span>
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
              {regions.length === 0 ? (
                <div className="px-2 py-2 text-[var(--text-sub-color)] ">
                  {tCommon("noDataAvailable")}
                </div>
              ) : (
                regions.map((region) => {
                  const regionId = region[0];
                  const regionNameRow = region[1];
                  const leagues = region[2] ?? [];
                  const flagIcon = getFlagIconFromregionName(
                    regionNameRow || "",
                  );
                  const regionCounts =
                    sportId != null
                      ? summarySportsLive.value.counts[sportId]?.regions?.[
                          regionId
                        ]
                      : undefined;
                  if ((regionCounts?.total ?? 0) === 0) {
                    return null;
                  }
                  return (
                    <div key={regionId}>
                      {leagues.map((league) => {
                        const leagueId = league[0];
                        const leagueNameRow = league[1];
                        const leagueEventIds = league[2] ?? [];
                        const leagueCount =
                          regionCounts?.leagues?.[leagueId] ?? 0;
                        if (leagueCount === 0) {
                          return null;
                        }
                        // Only render leagues that already have at least one
                        // event loaded into the global store — avoids a
                        // flash of empty league rows while the per-event
                        // fetch is in flight.
                        const hasLoadedEvents = leagueEventIds.some(
                          (id) => !!storeState.value[id]?.value,
                        );
                        if (!hasLoadedEvents) return null;
                        const collapsed = unExpandedLeagues.has(
                          leagueNameRow || "",
                        );
                        return (
                          <div
                            key={`${regionId}-${leagueId}`}
                            className={`flex flex-col px-[5px] ${!collapsed ? "pb-[5px]" : ""}`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRegion(regionNameRow || "");
                                toggleLeague(leagueNameRow || "");
                              }}
                              className={`flex items-center h-[36px] justify-between px-2 pt-2 pb-1 rounded-[4px]  transition-colors w-full`}
                            >
                              <div className="flex items-center gap-[10px] min-w-0">
                                {flagIcon ? (
                                  <img
                                    src={flagIcon}
                                    alt={regionNameRow || ""}
                                    className="w-[16px] h-[16px] rounded-full shrink-0"
                                  />
                                ) : (
                                  <div className="w-[18px] h-[12px] shrink-0" />
                                )}
                                <span className="flex-1 text-left truncate min-w-0">
                                  {regionNameRow} {leagueNameRow}
                                </span>
                              </div>
                              <img
                                className={`w-[24px] rounded-[4px] h-[24px] transition-all duration-300 ${
                                  !collapsed ? "-rotate-90" : "rotate-90"
                                } ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                                src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                                alt="arrow-right"
                              />
                            </button>

                            {!collapsed && (
                              <div className="overflow-hidden transition-all duration-300 ease-in-out">
                                <div className="flex flex-col w-full h-full gap-2 rounded-[4px]">
                                  {leagueEventIds.length > 0 ? (
                                    leagueEventIds.map((matchId) => {
                                      const isSelectedMatch =
                                        matchId === parseInt(eventId ?? "0");
                                      return (
                                        <div
                                          key={matchId}
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
                                            selectedEventId={matchId}
                                            marketSlug={"match-result"}
                                            loading={loadingMatches}
                                          />
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="px-2 py-2 text-[var(--text-sub-color)] text-[12px]">
                                      No matches available
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
              )}
            </div>
          </div>
        )
      ) : null}
    </div>
  );
};
