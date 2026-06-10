import { FunctionComponent } from "preact";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { isMobile } from "@/state/isMobile";
import { MiniMatch } from "@/app/components/MatchesBoard/components/Match/MiniMatch";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { useRouteParams } from "@/hooks/useRotueParams";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { useTranslate } from "@/shared/i18n/i18n";
import { storeState } from "@/state/storeState";
import { MiniMatchLoader } from "../../Loading";
import { liveScrollPos } from "@/state/liveScrollPos";
import { baseColorTheme } from "@/state/baseColorTheme";
import {
  countsSummarySportsState,
  summarySportsLiveState,
} from "@/state/summarySports";
import { loadedLiveState } from "@/state/loadedLiveState";
import type { LiveSidebarStoreSport } from "@/api/sidebar/apiGetLiveSidebar";

interface LiveSportSectionProps {
  selectedSportName: string;
  isExpanded?: boolean;
  toggleSport?: (sportSlug: string) => void;
  groupByRegions: boolean;
}

type LeagueRow = {
  key: string;
  regionName: string;
  leagueName: string;
  eventIds: number[];
};

function leaguesForSport(sport: LiveSidebarStoreSport | undefined): LeagueRow[] {
  if (!sport) return [];

  const rows: LeagueRow[] = [];
  for (const region of sport.regions) {
    for (const league of region.leagues) {
      if (!league.events.length) continue;
      rows.push({
        key: `${region.id}-${league.id}`,
        regionName: region.name,
        leagueName: league.name,
        eventIds: league.events,
      });
    }
  }
  return rows;
}

export const LiveSportSection: FunctionComponent<LiveSportSectionProps> = ({
  isExpanded = false,
  toggleSport,
  groupByRegions,
  selectedSportName,
}) => {
  const baseTheme = baseColorTheme.value;
  const { t: tCommon } = useTranslate("common");
  const { leagueName, eventId } = useRouteParams();

  const [liveSports, setLiveSports] = useState(summarySportsLiveState.value);
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    return summarySportsLiveState.subscribe(setLiveSports);
  }, []);

  const sport = useMemo(
    () => liveSports.find((s) => s.name === selectedSportName),
    [liveSports, selectedSportName],
  );

  const leagueRows = useMemo(() => leaguesForSport(sport), [sport]);

  const matchCount =
    sport != null
      ? (countsSummarySportsState.value.liveCount.counts[sport.id] ?? 0)
      : 0;

  const loading = isExpanded && !loadedLiveState.value;

  useEffect(() => {
    if (groupByRegions) {
      setCollapsedLeagues(new Set());
    }
  }, [groupByRegions]);

  useEffect(() => {
    if (!leagueName) return;
    const row = leagueRows.find((r) => r.leagueName === leagueName);
    if (!row) return;
    setCollapsedLeagues((prev) => {
      const next = new Set(prev);
      next.delete(row.key);
      return next;
    });
  }, [leagueName, leagueRows]);

  const toggleLeague = useCallback((key: string) => {
    setCollapsedLeagues((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const chevronClass = (expanded: boolean) =>
    [
      "h-6 w-6 shrink-0 rounded-[4px] transition-all duration-300",
      expanded ? "-rotate-90" : "rotate-90",
      baseTheme === "dark" ? "brightness-0 invert" : "brightness-0",
    ].join(" ");

  return (
    <div className="flex w-full flex-col gap-2">
      {!isMobile.value ? (
        <button
          type="button"
          onClick={() => toggleSport?.(selectedSportName)}
          className="flex w-full items-center justify-between rounded-[4px] px-[5px] py-2 font-medium text-[var(--text-basic-color)] transition-colors"
        >
          <div className="flex flex-1 items-center gap-2">
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${sport?.id ?? 0}.svg`}
              onError={(e) => {
                e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
              }}
              alt={selectedSportName}
              className={`h-5 w-5 ${baseTheme === "dark" ? "invert" : ""}`}
            />
            <span className="flex-1 text-left">{selectedSportName}</span>
            <span className="pr-[10px]">{matchCount}</span>
          </div>
          <img
            className={chevronClass(isExpanded)}
            src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
            alt=""
          />
        </button>
      ) : null}

      {isExpanded ? (
        loading ? (
          <div className="mt-1 flex flex-col rounded-[4px]">
            {Array.from({ length: 3 }).map((_, index) => (
              <MiniMatchLoader key={index} />
            ))}
          </div>
        ) : (
          <div className="mt-1 flex flex-col gap-2 overflow-hidden rounded-[4px] transition-all duration-300 ease-in-out">
            {leagueRows.length === 0 ? (
              <div className="px-2 py-2 text-[var(--text-sub-color)]">
                {tCommon("noDataAvailable")}
              </div>
            ) : (
              leagueRows.map((row) => {
                const hasLoadedEvents = row.eventIds.some(
                  (id) => !!storeState.value[id]?.value,
                );
                if (!hasLoadedEvents) return null;

                const isLeagueExpanded = !collapsedLeagues.has(row.key);
                const flagIcon = getFlagIconFromregionName(row.regionName);

                return (
                  <div
                    key={row.key}
                    className={`flex flex-col px-[5px] ${isLeagueExpanded ? "pb-[5px]" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLeague(row.key);
                      }}
                      className="flex h-[36px] w-full items-center justify-between rounded-[4px] px-2 pb-1 pt-2 transition-colors"
                    >
                      <div className="flex min-w-0 items-center gap-[10px]">
                        {flagIcon ? (
                          <img
                            src={flagIcon}
                            alt={row.regionName}
                            className="h-4 w-4 shrink-0 rounded-full"
                          />
                        ) : (
                          <div className="h-3 w-[18px] shrink-0" />
                        )}
                        <span className="min-w-0 flex-1 truncate text-left">
                          {row.regionName} {row.leagueName}
                        </span>
                      </div>
                      <img
                        className={chevronClass(isLeagueExpanded)}
                        src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                        alt=""
                      />
                    </button>

                    {isLeagueExpanded ? (
                      <div className="overflow-hidden transition-all duration-300 ease-in-out">
                        <div className="flex h-full w-full flex-col gap-2 rounded-[4px]">
                          {row.eventIds.map((matchId) => {
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
                                        el.getBoundingClientRect().top -
                                        scrollParent.getBoundingClientRect()
                                          .top +
                                        scrollParent.scrollTop;
                                    } else {
                                      liveScrollPos.value = el.offsetTop;
                                    }
                                  }
                                }}
                              >
                                <MiniMatch
                                  selectedEventId={matchId}
                                  marketSlug="match-result"
                                  loading={false}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        )
      ) : null}
    </div>
  );
};
