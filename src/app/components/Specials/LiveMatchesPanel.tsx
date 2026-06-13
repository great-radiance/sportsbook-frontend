import { FunctionComponent } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { useTranslate } from "@/shared/i18n/i18n";
import { SportsList } from "../SportsList";
import { LiveMatchesPanelLoader } from "@/app/components/Loading";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { useRouteParams } from "@/hooks/useRotueParams";
import { useLocation } from "wouter-preact";
import { Match } from "../MatchesBoard/components/Match";
import { MarketNavigation } from "../marketNavigation";
import { useSidebarMarketNavigation } from "@/hooks/useSidebarMarketNavigation";
import {
  eventHasMarketType,
  isMoneylineSport,
} from "@/helpers/sidebarMarketNavigation";
import { isRacingSport } from "@/helpers/isRacingSport";
import { MoneylineMatch } from "../MatchesBoard/components/Match/MoneylineMatch";
import { apiGetLiveSidebar } from "@/api/sidebar/apiGetLiveSidebar";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import type { LiveSidebarStoreSport } from "@/api/sidebar/apiGetLiveSidebar";

type LeagueRow = {
  key: string;
  regionName: string;
  leagueName: string;
  eventIds: number[];
};

function sportEventCount(sport: LiveSidebarStoreSport): number {
  let count = 0;
  for (const region of sport.regions) {
    for (const league of region.leagues) {
      count += league.events.length;
    }
  }
  return count;
}

function leaguesForSport(
  sport: LiveSidebarStoreSport | undefined,
): LeagueRow[] {
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

export const LiveMatchesPanel: FunctionComponent = () => {
  const {
    baseColorTheme,
    summarySportsLiveState,
    loadedLiveState,
    storeState,
    countsSummarySportsState,
  } = useSportsbookStore();
  const { t: tCommon } = useTranslate("common");
  const [, setLocation] = useLocation();
  const { pageName } = useRouteParams();
  const baseTheme = baseColorTheme.value;

  const [liveSports, setLiveSports] = useState(summarySportsLiveState.value);
  const [selectedSportId, setSelectedSportId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    return summarySportsLiveState.subscribe(setLiveSports);
  }, []);

  useEffect(() => {
    (async () => {
      if (liveSports.length > 0) {
        setLoading(false);
        return;
      }
      try {
        await apiGetLiveSidebar();
      } catch (error) {
        console.error("Error loading live sidebar:", error);
      } finally {
        loadedLiveState.value = true;
        setLoading(false);
      }
    })();
  }, [liveSports.length]);

  useEffect(() => {
    if (!liveSports.length) return;
    if (!liveSports.some((sport) => sport.id === selectedSportId)) {
      setSelectedSportId(liveSports[0].id);
    }
  }, [liveSports, selectedSportId]);

  useEffect(() => {
    setCollapsedLeagues(new Set());
  }, [selectedSportId]);

  const selectedSport = useMemo(
    () => liveSports.find((sport) => sport.id === selectedSportId),
    [liveSports, selectedSportId],
  );

  const sportsData = useMemo(
    () =>
      liveSports.map((sport) => ({
        id: sport.id,
        name: sport.name,
        count: sportEventCount(sport),
      })),
    [liveSports],
  );

  const leagueRows = useMemo(
    () => leaguesForSport(selectedSport),
    [selectedSport],
  );

  const loadedEvents = useMemo(() => {
    if (!selectedSport) return [];
    const ids = leagueRows.flatMap((row) => row.eventIds);
    return ids.map((id) => storeState.value[id]?.value).filter(Boolean);
  }, [selectedSport, leagueRows, storeState.value]);

  const {
    marketOptions,
    showMarketNav,
    selectedMarketType,
    setSelectedMarketType,
    matchMarketType,
    allowAutoSelect,
  } = useSidebarMarketNavigation({
    markets: selectedSport?.markets ?? [],
    loadedEvents,
    suppressMarketNav:
      !selectedSport ||
      isMoneylineSport(selectedSport.id, selectedSport.name) ||
      isRacingSport(selectedSport.id, selectedSport.name),
  });

  const totalLive = countsSummarySportsState.value.liveCount.totalCount;
  const selectedSportCount = selectedSport ? sportEventCount(selectedSport) : 0;

  const visibleLeagueRows = useMemo(() => {
    if (!selectedSport) return [];

    return leagueRows
      .map((row) => {
        const visibleIds = row.eventIds.filter((eventId) => {
          const event = storeState.value[eventId]?.value;
          if (!event) return false;
          if (
            isMoneylineSport(
              event.sport?.id ?? selectedSportId ?? 0,
              event.sport?.name,
            )
          ) {
            return true;
          }
          if (!showMarketNav) return true;
          return eventHasMarketType(event, selectedMarketType);
        });
        return { ...row, visibleIds };
      })
      .filter((row) => row.visibleIds.length > 0);
  }, [
    selectedSport,
    leagueRows,
    selectedSportId,
    showMarketNav,
    selectedMarketType,
    storeState.value,
  ]);

  const allLeaguesExpanded = useMemo(
    () =>
      visibleLeagueRows.length > 0 &&
      visibleLeagueRows.every((row) => !collapsedLeagues.has(row.key)),
    [visibleLeagueRows, collapsedLeagues],
  );

  const toggleLeague = useCallback((key: string) => {
    setCollapsedLeagues((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleAllLeagues = useCallback(() => {
    setCollapsedLeagues((prev) => {
      if (visibleLeagueRows.every((row) => !prev.has(row.key))) {
        return new Set(visibleLeagueRows.map((row) => row.key));
      }
      return new Set();
    });
  }, [visibleLeagueRows]);

  const leagueChevronClass = (expanded: boolean) =>
    [
      "h-6 w-6 shrink-0 rounded-[4px] transition-all duration-300",
      expanded ? "-rotate-90" : "rotate-90",
      baseTheme === "dark" ? "brightness-0 invert" : "brightness-0",
    ].join(" ");

  if (!loading && liveSports.length === 0) return null;

  return (
    <section className="flex w-full flex-col gap-2 overflow-hidden rounded-[16px] bg-[var(--background-color)] p-2 text-[var(--text-basic-color)]">
      <div className="sticky top-0 flex w-full flex-col">
        <div className="flex w-full items-center pt-4 pb-2">
          <div className="flex flex-1 items-center gap-2">
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/live.png`}
              alt=""
              className={`h-6 w-6 object-contain ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
            />
            <span className="text-[20px] font-bold">
              {tCommon("liveMatches")}({totalLive})
            </span>
          </div>

          {pageName !== "live" ? (
            <button
              type="button"
              className="flex items-center gap-2"
              onClick={() => setLocation("/event-view/live")}
            >
              <span className="rounded-full bg-[var(--sub-element-secondary)] px-2 py-1 text-[12px] font-bold text-[var(--text-secondary-color)]">
                {totalLive} {tCommon("liveMatches")}
              </span>
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/arrow.png`}
                alt=""
                className={`h-3 w-3 object-contain ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
              />
            </button>
          ) : null}
        </div>

        <SportsList
          sportsData={sportsData}
          selectedSport={selectedSportId ?? 0}
          onSelectSport={setSelectedSportId}
          loading={loading}
          isLive
        />
      </div>

      {loading ? (
        <LiveMatchesPanelLoader showMarketTabs={pageName === "live"} />
      ) : (
        <>
          {selectedSport ? (
            <div className="flex items-center justify-between py-2 md:px-2">
              <div className="flex min-w-0 items-center gap-2">
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${selectedSport.id}.svg`}
                  alt=""
                  className={`h-5 w-5 shrink-0 object-contain ${baseTheme === "dark" ? "invert" : ""}`}
                  onError={(e) => {
                    e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
                  }}
                />
                <span className="truncate text-[16px] font-bold">
                  {selectedSport.name} ({selectedSportCount})
                </span>
              </div>
              {/* <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center"
                onClick={toggleAllLeagues}
                aria-label={tCommon("expandCollapse")}
                title={tCommon("expandCollapse")}
              >
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/column.png`}
                  alt=""
                  className={`h-5 w-5 object-contain ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"} ${allLeaguesExpanded ? "" : "rotate-180"}`}
                />
              </button> */}
            </div>
          ) : null}

          {showMarketNav ? (
            <MarketNavigation
              options={marketOptions}
              selectedValue={selectedMarketType}
              onSelect={setSelectedMarketType}
            />
          ) : null}

          <div className="mt-1 flex flex-col rounded-[4px]">
            {visibleLeagueRows.length === 0 ? (
              <p className="px-2 py-2 text-[12px] text-[var(--text-sub-color)]">
                {tCommon("noDataAvailable")}
              </p>
            ) : (
              visibleLeagueRows.map((row) => {
                const isExpanded = !collapsedLeagues.has(row.key);
                const isMoneyline = isMoneylineSport(
                  selectedSportId ?? 0,
                  selectedSport?.name,
                );

                return (
                  <div
                    key={row.key}
                    className={`flex flex-col md:px-[5px] ${isExpanded ? "pb-[5px]" : ""}`}
                  >
                    <button
                      type="button"
                      className="flex h-[34px] w-full items-center justify-between gap-2 py-2 text-[12px] md:px-2"
                      onClick={() => toggleLeague(row.key)}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <img
                          src={`${BASE_ASSET_PUBLIC_URL}/icons/star.png`}
                          alt=""
                          className={`h-4 w-4 shrink-0 object-contain ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                        />
                        <img
                          src={getFlagIconFromregionName(row.regionName)}
                          alt=""
                          className="h-4 w-4 shrink-0 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = getFlagIconFromregionName(
                              row.regionName,
                            );
                          }}
                        />
                        <span className="min-w-0 flex-1 truncate text-left">
                          {row.regionName} - {row.leagueName}
                        </span>
                      </div>
                      <img
                        src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                        alt=""
                        className={leagueChevronClass(isExpanded)}
                      />
                    </button>

                    {isExpanded ? (
                      <div
                        className={`flex flex-col ${isMoneyline ? "gap-1" : "overflow-hidden rounded-[8px] border border-[var(--border-color)] bg-[var(--sub-element-color)]"}`}
                      >
                        {row.visibleIds.map((eventId, index) =>
                          isMoneyline ? (
                            <MoneylineMatch key={eventId} eventId={eventId} />
                          ) : (
                            <Match
                              key={eventId}
                              eventId={eventId}
                              marketType={matchMarketType}
                              allowAutoSelect={allowAutoSelect}
                              allowRounded={
                                index === 0 ||
                                index === row.visibleIds.length - 1
                              }
                            />
                          ),
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </section>
  );
};
