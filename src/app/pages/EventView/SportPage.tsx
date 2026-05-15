import { FunctionComponent } from "preact";
import { useEffect, useState, useCallback, useMemo, useRef } from "preact/hooks";
import { useRouteParams } from "@/hooks/useRotueParams";
import { outRightSummarySports, summarySports } from "@/state/summarySports";
import { UpcomingMatchSkeleton } from "@/app/components/Loading";
import { apiGetMatches } from "@/api/matches/apiGetMatches";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { HorizontalTabs } from "@/app/components/HorizontalTabs";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { MarketNavigation } from "@/app/components/marketNavigation";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { orderConfigState } from "@/state/orderConfigState";
import { baseColorTheme } from "@/state/baseColorTheme";
import HighlightRender from "@/app/components/SportPage/HighlightRender";
import UpcomingRender from "@/app/components/SportPage/UpcomingRender";
import CompetitionsRender from "@/app/components/SportPage/CompetitionsRender";
import { storeEvent } from "@/helpers/storeEvent";
import { storeState } from "@/state/storeState";

import { sortLeagues } from "@/helpers/sortLeagues";

/** Keep batches small so `/events/selected?eventIds=...` URLs stay within limits. */
const UPCOMING_MATCH_IDS_CHUNK = 80;

/** Tree shape expected by `CompetitionsRender` (popular leagues + region groups). */
type CompetitionNode = {
  id: number;
  name: string;
  type: "sport" | "league" | "region" | "custom";
  children?: CompetitionNode[];
};

interface LeagueEntry {
  key: string;
  region: string;
  league: string;
  eventIds: number[];
  outrightIds: number[];
  matchCount: number;
}

export const SportPage: FunctionComponent = () => {
  const {
    sportName,
    sportIdParam,
    regionName,
    regionIdParam,
    leagueName,
    leagueIdParam,
  } = useRouteParams();
  const [selectedCategory, setSelectedCategory] = useState<string>("Matches");
  const [selectedMarketSlug, setSelectedMarketSlug] =
    useState<string>("Winner");
  const [loading, setLoading] = useState(true);
  const [selectedMarkets, setSelectedMarkets] = useState<
    Record<string, string[]>
  >({});
  const [selectedOutrightMarkets, setSelectedOutrightMarkets] = useState<
    Record<string, string[]>
  >({});
  const [selectedLeagueKey, setSelectedLeagueKey] = useState<string>("");
  const baseTheme = baseColorTheme.value;
  const sportRegions = useMemo(
    () =>
      summarySports.value?.data?.find(
        (s) => s[0] === Number(sportIdParam),
      )?.[2] ?? [],
    [sportIdParam, summarySports.value],
  );
  const outrightSportRegions = useMemo(
    () =>
      outRightSummarySports.value?.data?.find(
        (s) => s[0] === Number(sportIdParam),
      )?.[2] ?? [],
    [sportIdParam, outRightSummarySports.value],
  );
  const [activeTab, setActiveTab] = useState<
    "highlights" | "competitions" | "upcoming"
  >("highlights");
  const [upcomingHydrateLoading, setUpcomingHydrateLoading] = useState(false);
  const upcomingHydrateRunRef = useRef(0);

  const leagueEntriesNotSorted = useMemo<LeagueEntry[]>(() => {
    return sportRegions
      .flatMap((region) => {
        const regionId = region[0];
        const regionName = region[1];
        const leagues = region[2] ?? [];
        const outrightLeaguesForRegion =
          outrightSportRegions.find((r) => r[0] === regionId)?.[2] ?? [];

        return leagues.map((league) => {
          const leagueId = league[0];
          const leagueName = league[1];
          const eventIds = (league[2] ?? []).map((id) => Number(id)).filter(Number.isFinite);

          const outrightLeague = outrightLeaguesForRegion.find(
            (l) => l[0] === leagueId,
          );
          const outrightIds = (outrightLeague?.[2] ?? [])
            .map((id) => Number(id))
            .filter(Number.isFinite);

          return {
            key: `${regionName}|||${leagueName}`,
            region: regionName,
            league: leagueName,
            eventIds,
            outrightIds,
            matchCount: eventIds.length + outrightIds.length,
          };
        });
      })
      .filter((entry) => entry.matchCount > 0)
      .sort(
        (a, b) =>
          b.matchCount - a.matchCount || a.league.localeCompare(b.league),
      );
  }, [sportRegions, outrightSportRegions]);

  const leagueEntries: LeagueEntry[] = useMemo(() => {
    return sortLeagues(leagueEntriesNotSorted, sportName);
  }, [leagueEntriesNotSorted, sportName]);

  /** Built from `summarySports` / `outRightSummarySports` — replaces Stoiximan sidebar for Competitions tab. */
  const competitionsTree = useMemo((): CompetitionNode | null => {
    if (!sportName || sportRegions.length === 0) return null;
    const popular: CompetitionNode[] = leagueEntriesNotSorted
      .slice(0, 12)
      .map((e, idx) => ({
        id: 1_000_000 + idx,
        name: e.league,
        type: "league" as const,
      }));
    const regionsNode: CompetitionNode = {
      id: -1,
      name: "Regions",
      type: "custom",
      children: sportRegions.map((reg) => ({
        id: reg[0] as number,
        name: String(reg[1] ?? ""),
        type: "region" as const,
        children: (reg[2] ?? []).map((lg) => ({
          id: lg[0] as number,
          name: String(lg[1] ?? ""),
          type: "league" as const,
        })),
      })),
    };
    return {
      id: Number(sportIdParam) || 0,
      name: sportName,
      type: "sport",
      children: [...popular, regionsNode],
    };
  }, [sportName, sportIdParam, sportRegions, leagueEntriesNotSorted]);

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

    if (
      !selectedLeagueKey ||
      !leagueEntries.some((entry) => entry.key === selectedLeagueKey)
    ) {
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
      const eventIds = selectedLeagueEntry.eventIds ?? [];
      if (eventIds.length > 0) {
        const matches = await apiGetMatches(eventIds);
        const sortedMatches = (matches ?? []).sort(
          (a, b) =>
            new Date(a.eventInfo.startTime).getTime() -
            new Date(b.eventInfo.startTime).getTime(),
        );
        sortedMatches.forEach((event) => storeEvent(event));
      }

      // Outright fetching is not migrated to the new API/types yet; keep the
      // state placeholders so child components stay typed correctly.
      setSelectedMarkets({ [selectedLeagueEntry.key]: [] });
      setSelectedOutrightMarkets({ [selectedLeagueEntry.key]: [] });
    } catch (error) {
      console.error("Error fetching sport league matches:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedLeagueEntry, sportName]);

  /**
   * `UpcomingRender` filters every league by `storeState` start times, but
   * `fetchLeagueMatches` only hydrates the selected league — load the rest when
   * the Upcoming tab is open so time windows and grouping work.
   */
  const hydrateStoreForUpcomingTab = useCallback(async () => {
    const allIds = leagueEntries.flatMap((e) => e.eventIds);
    const unique = [...new Set(allIds)]
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);
    const missing = unique.filter((id) => {
      const st = storeState.value[id]?.value?.startTime;
      return !st;
    });
    for (let i = 0; i < missing.length; i += UPCOMING_MATCH_IDS_CHUNK) {
      const slice = missing.slice(i, i + UPCOMING_MATCH_IDS_CHUNK);
      const matches = await apiGetMatches(slice);
      (matches ?? []).forEach((event) => storeEvent(event));
    }
  }, [leagueEntries]);

  useEffect(() => {
    if (activeTab !== "upcoming") {
      upcomingHydrateRunRef.current += 1;
      setUpcomingHydrateLoading(false);
      return;
    }
    if (!loadedSidebarState.value || !sportName) return;
    if (leagueEntries.length === 0) return;

    const runId = ++upcomingHydrateRunRef.current;
    setUpcomingHydrateLoading(true);
    (async () => {
      try {
        await hydrateStoreForUpcomingTab();
      } catch (e) {
        console.error("SportPage upcoming hydrate:", e);
      } finally {
        if (runId === upcomingHydrateRunRef.current) {
          setUpcomingHydrateLoading(false);
        }
      }
    })();
  }, [
    activeTab,
    sportName,
    loadedSidebarState.value,
    leagueEntries,
    hydrateStoreForUpcomingTab,
  ]);

  const tabStyle = (tab: string) =>
    `flex-1 py-2 text-center text-[10px] font-medium transition ${
      activeTab === tab
        ? "bg-blue-600 text-white rounded-full"
        : "text-[var(--text-sub-color)]"
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

  const renderContent = () => {
    switch (activeTab) {
      case "highlights":
        return (
          <HighlightRender
            leagueEntries={leagueEntries}
            selectedLeagueKey={selectedLeagueKey}
            setSelectedLeagueKey={setSelectedLeagueKey}
            orderConfigState={orderConfigState}
            sportName={sportName}
            selectedCategory={selectedCategory}
            selectedMarkets={selectedMarkets}
            selectedOutrightMarkets={selectedOutrightMarkets}
            selectedMarketSlug={selectedMarketSlug}
            setSelectedMarketSlug={setSelectedMarketSlug}
            selectedLeagueEntry={selectedLeagueEntry}
            loading={loading}
            BASE_ASSET_PUBLIC_URL={BASE_ASSET_PUBLIC_URL}
            getFlagIconFromregionName={getFlagIconFromregionName}
          />
        );

      case "competitions":
        return (
          <CompetitionsRender
            data={competitionsTree}
            sportName={sportName}
            leagueEntries={leagueEntries}
          />
        );

      case "upcoming":
        return (
          <UpcomingRender
            leagueEntries={leagueEntries}
            selectedLeagueKey={selectedLeagueKey}
            setSelectedLeagueKey={setSelectedLeagueKey}
            orderConfigState={orderConfigState}
            sportName={sportName}
            selectedCategory={selectedCategory}
            selectedMarkets={selectedMarkets}
            selectedOutrightMarkets={selectedOutrightMarkets}
            selectedMarketSlug={selectedMarketSlug}
            setSelectedMarketSlug={setSelectedMarketSlug}
            selectedLeagueEntry={selectedLeagueEntry}
            loading={loading || upcomingHydrateLoading}
            BASE_ASSET_PUBLIC_URL={BASE_ASSET_PUBLIC_URL}
            getFlagIconFromregionName={getFlagIconFromregionName}
          />
        );
    }
  };

  return (
    <div
      className={`relative flex flex-col w-full h-full text-[var(--text-basic-color)] my-2 rounded-lg`}
    >
      <section className="rounded-[24px]">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/event-view" },
            { label: sportName },
          ]}
        />
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-[12px] uppercase tracking-[0.28em] text-[var(--text-sub-color)] font-semibold">
              {sportName} sport page
            </span>
            <div className={`flex gap-[4px] flex-1 min-w-0 items-center`}>
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
                {sportName}
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
      {renderContent()}
    </div>
  );
};
