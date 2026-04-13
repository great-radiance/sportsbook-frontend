import { FunctionComponent } from "preact";
import { useEffect, useState, useCallback, useMemo } from "preact/hooks";
import { useRouteParams } from "@/hooks/useRotueParams";
import { outRightSummarySports, summarySports } from "@/state/summarySports";
import { getTranslatedText } from "@/helpers/getTranslate";
import { Match } from "@/app/components/MatchesBoard/components/Match";
import { UpcomingMatchSkeleton } from "@/app/components/Loading";
import { apiGetMatches, responseEvent } from "@/api/matches/apiGetMatches";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { HorizontalTabs } from "@/app/components/HorizontalTabs";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { MarketNavigation } from "@/app/components/marketNavigation";
import { convertAndStoreEvent } from "@/helpers/convertAndStoreEvent";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { apiGetOutrightMatchs } from "@/api/matches/apiGetOutrightMatchs";
import { orderConfigState } from "@/state/orderConfigState";
import { baseColorTheme } from "@/state/baseColorTheme";

const CATEGORIES = ["Matches", "Outright"] as const;

interface LeagueEntry {
  key: string;
  region: string;
  league: string;
  eventIds: number[];
  outrightIds: number[];
  matchCount: number;
}

export const SportPage: FunctionComponent = () => {
  const { sportName, regionName, leagueName } = useRouteParams();
  const [selectedCategory, setSelectedCategory] = useState<string>("Matches");
  const [selectedMarketSlug, setSelectedMarketSlug] =
    useState<string>("Winner");
  const [loading, setLoading] = useState(true);
  const [selectedMarkets, setSelectedMarkets] = useState<Record<string, string[]>>(
    {},
  );
  const [selectedOutrightMarkets, setSelectedOutrightMarkets] =
    useState<Record<string, string[]>>({});
  const [selectedLeagueKey, setSelectedLeagueKey] = useState<string>("");
  const baseTheme = baseColorTheme.value
  const sportRegions = useMemo(
    () => summarySports.value?.data?.[sportName || ""] || {},
    [sportName],
  );
const [activeTab, setActiveTab] = useState<"highlights" | "competitions" | "upcoming">("highlights");

  const leagueEntries = useMemo(() => {
    return Object.entries(sportRegions)
      .flatMap(([region, leagues]) =>
        Object.entries(leagues || {}).map(([league, events]) => {
          const eventIds = Object.values(events || {}).map((m) => m[0]);
          const outrightIds =
            Object.values(
              outRightSummarySports.value?.[sportName || ""]?.[region]?.[league] ||
                {},
            ).map((m) => m[0]);
          return {
            key: `${region}|||${league}`,
            region,
            league,
            eventIds,
            outrightIds,
            matchCount: eventIds.length + outrightIds.length,
          };
        }),
      )
      .filter((entry) => entry.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount || a.league.localeCompare(b.league));
  }, [sportRegions, sportName]);

  const selectedLeagueEntry = useMemo(() => {
    if (regionName && leagueName) {
      return leagueEntries.find(
        (entry) => entry.region === regionName && entry.league === leagueName,
      );
    }
    return leagueEntries.find((entry) => entry.key === selectedLeagueKey);
  }, [leagueEntries, regionName, leagueName, selectedLeagueKey]);

  useEffect(() => {
    if (leagueEntries.length === 0) {
      setSelectedLeagueKey("");
      return;
    }

    if (regionName && leagueName) {
      const targetKey = `${regionName}|||${leagueName}`;
      if (leagueEntries.some((entry) => entry.key === targetKey)) {
        setSelectedLeagueKey(targetKey);
        return;
      }
    }

    if (!selectedLeagueKey || !leagueEntries.some((entry) => entry.key === selectedLeagueKey)) {
      setSelectedLeagueKey(leagueEntries[0].key);
    }
  }, [leagueEntries, regionName, leagueName, selectedLeagueKey]);

  const fetchLeagueMatches = useCallback(async () => {
    if (!sportName || !selectedLeagueEntry) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [matchRes, outrightRes] = await Promise.all([
        selectedLeagueEntry.eventIds.length > 0
          ? apiGetMatches(selectedLeagueEntry.eventIds, "PreMatch", sportName)
          : Promise.resolve({ data: [], marketsMeta: [] } as Awaited<
              ReturnType<typeof apiGetMatches>
            >),
        selectedLeagueEntry.outrightIds.length > 0
          ? apiGetOutrightMatchs(selectedLeagueEntry.outrightIds)
          : Promise.resolve({ data: [], marketsMeta: [] } as Awaited<
              ReturnType<typeof apiGetOutrightMatchs>
            >),
      ]);

      const sortedMatches = matchRes.data.sort((a, b) => (a[9] ?? 0) - (b[9] ?? 0));
      const sortedOutrights = outrightRes.data.sort(
        (a, b) => (a[9] ?? 0) - (b[9] ?? 0),
      );

      convertAndStoreEvent(sortedMatches);
      convertAndStoreEvent(sortedOutrights as unknown as responseEvent[]);

      setSelectedMarkets({
        [selectedLeagueEntry.key]: matchRes.marketsMeta,
      });
      setSelectedOutrightMarkets({
        [selectedLeagueEntry.key]: outrightRes.marketsMeta,
      });
    } catch (error) {
      console.error("Error fetching sport league matches:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedLeagueEntry, sportName]);

  const tabStyle = (tab: string) =>
    `flex-1 py-2 text-center text-[10px] font-medium transition ${
      activeTab === tab
        ? "bg-blue-600 text-white rounded-full"
        : "text-gray-500"
    }`;

  useEffect(() => {
    fetchLeagueMatches();
  }, [fetchLeagueMatches]);

  useEffect(() => {
    if (loadedSidebarState.value) {
      fetchLeagueMatches();
    }
  }, [loadedSidebarState.value, fetchLeagueMatches]);

  if (!sportName) {
    return null;
  }

  return (
    <div className={`relative flex flex-col w-full h-full text-[var(--text-basic-color)] my-2 rounded-lg`}>
      <section className="rounded-[24px]">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/event-view" },
            { label: getTranslatedText(sportName) },
          ]}
        />
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-[12px] uppercase tracking-[0.28em] text-[var(--text-sub-color)] font-semibold">
              {getTranslatedText(sportName)} sport page
            </span>
            <div
              className={`flex gap-[4px] flex-1 min-w-0 items-center`}
            >
              <div className="w-[24px] h-full shrink-0">
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportsicons/${sportName}.png`}
                  onError={(e) => {
                    e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/icons/all-sports.png`;
                  }}
                  className={`w-[24px] h-[24px] ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                  alt=""
                />
              </div>
              <span
                className={`text-left text-[19px] font-bold uppercase break-words whitespace-normal`}
              >
                {getTranslatedText(sportName)}
              </span>
            </div>
          </div>
        </div>
      </section>
      <div className="flex bg-[var(--sub-element-secondary)] mt-5 w-full rounded-full p-1 mb-6">
        <button
          onClick={() => setActiveTab("highlights")}
          className={tabStyle("highlights")}
        >
          Highlights
        </button>
        <button
          onClick={() => setActiveTab("competitions")}
          className={tabStyle("competitions")}
        >
          Competitions
        </button>
        <button
          onClick={() => setActiveTab("upcoming")}
          className={tabStyle("upcoming")}
        >
          Upcoming
        </button>
      </div>

      <div className="flex sticky top-0 mb-4 z-[200] bg-[var(--background-element)] flex-col w-full p-2 gap-2 rounded-b-[16px]">
              {/* League tab list */}
              {/* League tab list */}
              <nav role="tablist" aria-label="Leagues" className="w-full">
                <HorizontalTabs scrollerClassName="py-1">
                  {leagueEntries.map((league) => {
                    const isSelected = selectedLeagueKey === league.key;
                    return (
                      <button
                        key={league}
                        role="tab"
                        aria-selected={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                        title={league.league}
                        className={[
                          "flex shrink-0 px-4 py-2 gap-2 items-center rounded-lg text-[12px] transition-colors",
                          "whitespace-nowrap",
                          isSelected
                            ? "bg-[var(--highlight-background)] font-bold border-[2px] border-[var(--border-color)]"
                            : "bg-[var(--sub-element-secondary)] hover:bg-[var(--highlight-background)]",
                        ].join(" ")}
                        onClick={() => setSelectedLeagueKey(league.key)}
                        style={{
                          order:
                            orderConfigState.value[sportName || ""]?.regions?.[
                              league.region || ""
                            ]?.leagues?.[league.league || ""]?.order || 999,
                        }}
                      >
                        <div className="flex items-center justify-center w-6 h-6 bg-white/90 rounded-[4px]">
                          <img
                            src={`${BASE_ASSET_PUBLIC_URL}/logo/leagues/${encodeURIComponent(sportName || "")}/${encodeURIComponent(league.region || "")}/${encodeURIComponent(league.league || "").toLowerCase()}.webp`}
                            className={`w-5 h-5 object-contain`}
                            onError={(e) => {
                              e.currentTarget.src = `${getFlagIconFromregionName(league.region || "")}`;
                              e.currentTarget.className = "rounded-full w-4 h-4";
                            }}
                            alt={league.league}
                          />
                        </div>
      
                        {getTranslatedText(league.league)}
                      </button>
                    );
                  })}
                </HorizontalTabs>
              </nav>
      
              <MarketNavigation
                options={
                  selectedCategory === "Matches"
                    ? (selectedMarkets[selectedLeagueKey] ?? [])
                    : (selectedOutrightMarkets[selectedLeagueKey] ?? [])
                }
                selectedValue={selectedMarketSlug}
                onSelect={setSelectedMarketSlug}
              />
            </div>

      <section className="flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col w-full gap-[2px] mt-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <UpcomingMatchSkeleton key={`match-${index}`} />
            ))}
          </div>
        ) : selectedCategory === "Matches" ? (
          (selectedLeagueEntry?.eventIds || []).map((eventId) => (
            <Match
              key={eventId}
              eventId={eventId}
              marketSlug={selectedMarketSlug}
            />
          ))
        ) : (
          (selectedLeagueEntry?.outrightIds || []).map((eventId) => (
            <Match
              key={eventId}
              eventId={eventId}
              marketSlug={selectedMarketSlug}
            />
          ))
        )}
      </section>
    </div>
  );
};
