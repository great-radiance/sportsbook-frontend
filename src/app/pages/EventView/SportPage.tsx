import { FunctionComponent } from "preact";
import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "preact/hooks";
import { useRouteParams } from "@/hooks/useRotueParams";
import { outRightSummarySports, summarySports } from "@/state/summarySports";
import { UpcomingMatchSkeleton } from "@/app/components/Loading";
import { apiGetMatches } from "@/api/matches/apiGetMatches";
import { apiGetUpcomingMatches } from "@/api/special-matches/apiGetUpcomingMatches";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { HorizontalTabs } from "@/app/components/HorizontalTabs";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { baseColorTheme } from "@/state/baseColorTheme";
import HighlightRender from "@/app/components/SportPage/HighlightRender";
import UpcomingRender from "@/app/components/SportPage/UpcomingRender";
import CompetitionsRender from "@/app/components/SportPage/CompetitionsRender";
import { storeEvent } from "@/helpers/storeEvent";
import { storeState } from "@/state/storeState";

import { sortLeagues } from "@/helpers/sortLeagues";
import { buildLeagueLabelMap } from "@/helpers/resolveSummaryLabels";
import { leagueBucketKey } from "@/helpers/summaryIds";

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
  sportId: number;
  regionId: number;
  leagueId: number;
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
  const [loading, setLoading] = useState(true);
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
  >(regionName === "upcoming" ? "upcoming" : "highlights");

  const [upcomingHydrateLoading, setUpcomingHydrateLoading] = useState(false);
  const upcomingHydrateRunRef = useRef(0);
  const [upcomingWindowHours, setUpcomingWindowHours] = useState<number>(24);
  const [upcomingLeagueEntries, setUpcomingLeagueEntries] = useState<
    LeagueEntry[]
  >([]);

  const sportIdNum = Number(sportIdParam) || 0;

  const leagueLabelMap = useMemo(
    () =>
      buildLeagueLabelMap(
        sportRegions as unknown as Parameters<typeof buildLeagueLabelMap>[0],
      ),
    [sportRegions],
  );

  const leagueEntriesNotSorted = useMemo<LeagueEntry[]>(() => {
    return sportRegions
      .flatMap((region) => {
        const regionId = region[0];
        const leagues = region[2] ?? [];
        const outrightLeaguesForRegion =
          outrightSportRegions.find((r) => r[0] === regionId)?.[2] ?? [];

        return leagues.map((league) => {
          const leagueId = league[0];
          const eventIds = (league[2] ?? [])
            .map((id) => Number(id))
            .filter(Number.isFinite);

          const outrightLeague = outrightLeaguesForRegion.find(
            (l) => l[0] === leagueId,
          );
          const outrightIds = (outrightLeague?.[2] ?? [])
            .map((id) => Number(id))
            .filter(Number.isFinite);

          const ids = {
            sportId: sportIdNum,
            regionId,
            leagueId,
          };

          return {
            key: leagueBucketKey(ids),
            ...ids,
            eventIds,
            outrightIds,
            matchCount: eventIds.length + outrightIds.length,
          };
        });
      })
      .filter((entry) => entry.matchCount > 0);
  }, [sportRegions, outrightSportRegions, sportIdNum]);

  const leagueEntries: LeagueEntry[] = useMemo(() => {
    return sortLeagues(leagueEntriesNotSorted, sportName, sportIdNum);
  }, [leagueEntriesNotSorted, sportName, sportIdNum]);

  /** Built from `summarySports` / `outRightSummarySports` — replaces Stoiximan sidebar for Competitions tab. */
  const competitionsTree = useMemo((): CompetitionNode | null => {
    if (!sportName || sportRegions.length === 0) return null;
    const popular: CompetitionNode[] = leagueEntries
      .slice(0, 12)
      .map((e, idx) => ({
        id: 1_000_000 + idx,
        name:
          leagueLabelMap.get(`${e.regionId}:${e.leagueId}`)?.leagueName ??
          String(e.leagueId),
        type: "league" as const,
      }));
    const leagueIdsWithEvents = new Set(leagueEntries.map((e) => e.leagueId));
    const regionNodes: CompetitionNode[] = [];
    for (const reg of sportRegions) {
      const regionId = reg[0] as number;
      const leaguesWithEvents = (reg[2] ?? []).filter((lg) =>
        leagueIdsWithEvents.has(lg[0] as number),
      );
      if (leaguesWithEvents.length === 0) continue;
      regionNodes.push({
        id: regionId,
        name: String(reg[1] ?? ""),
        type: "region",
        children: leaguesWithEvents.map((lg) => ({
          id: lg[0] as number,
          name: String(lg[1] ?? ""),
          type: "league",
        })),
      });
    }
    const regionsNode: CompetitionNode = {
      id: -1,
      name: "Regions",
      type: "custom",
      children: regionNodes,
    };
    return {
      id: Number(sportIdParam) || 0,
      name: sportName,
      type: "sport",
      children: [...popular, regionsNode],
    };
  }, [sportName, sportIdParam, sportRegions, leagueEntries, leagueLabelMap]);

  const selectedLeagueEntry = useMemo(() => {
    const regionId = Number(regionIdParam);
    const leagueId = Number(leagueIdParam);
    if (
      Number.isFinite(regionId) &&
      Number.isFinite(leagueId) &&
      leagueId > 0
    ) {
      return leagueEntries.find(
        (entry) => entry.regionId === regionId && entry.leagueId === leagueId,
      );
    }
    if (regionName && leagueName) {
      return leagueEntries.find((entry) => {
        const label = leagueLabelMap.get(`${entry.regionId}:${entry.leagueId}`);
        return (
          label?.regionName === regionName && label?.leagueName === leagueName
        );
      });
    }
    return leagueEntries.find((entry) => entry.key === selectedLeagueKey);
  }, [
    leagueEntries,
    regionIdParam,
    leagueIdParam,
    regionName,
    leagueName,
    selectedLeagueKey,
    leagueLabelMap,
  ]);

  useEffect(() => {
    if (leagueEntries.length === 0) {
      setSelectedLeagueKey("");
      return;
    }

    const regionId = Number(regionIdParam);
    const leagueId = Number(leagueIdParam);
    if (
      Number.isFinite(regionId) &&
      Number.isFinite(leagueId) &&
      leagueId > 0
    ) {
      const targetKey = leagueBucketKey({
        sportId: sportIdNum,
        regionId,
        leagueId,
      });
      if (leagueEntries.some((entry) => entry.key === targetKey)) {
        setSelectedLeagueKey(targetKey);
        return;
      }
    }
    if (regionName && leagueName) {
      const match = leagueEntries.find((entry) => {
        const label = leagueLabelMap.get(`${entry.regionId}:${entry.leagueId}`);
        return (
          label?.regionName === regionName && label?.leagueName === leagueName
        );
      });
      if (match) {
        setSelectedLeagueKey(match.key);
        return;
      }
    }

    if (
      !selectedLeagueKey ||
      !leagueEntries.some((entry) => entry.key === selectedLeagueKey)
    ) {
      setSelectedLeagueKey(leagueEntries[0].key);
    }
  }, [
    leagueEntries,
    regionIdParam,
    leagueIdParam,
    regionName,
    leagueName,
    selectedLeagueKey,
    sportIdNum,
    leagueLabelMap,
  ]);

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
    } catch (error) {
      console.error("Error fetching sport league matches:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedLeagueEntry, sportName]);

  /**
   * Upcoming tab: server filters IDs by sport + time window via
   * `apiGetUpcomingMatches`, then we hydrate full event detail in chunks.
   */
  useEffect(() => {
    if (activeTab !== "upcoming") {
      upcomingHydrateRunRef.current += 1;
      setUpcomingHydrateLoading(false);
      return;
    }
    if (!loadedSidebarState.value || !sportName || !sportIdNum) return;

    const runId = ++upcomingHydrateRunRef.current;
    setUpcomingHydrateLoading(true);

    const from = Math.floor(Date.now() / 1000);
    const to = from + upcomingWindowHours * 60 * 60;

    (async () => {
      try {
        const res = await apiGetUpcomingMatches({
          sportId: sportIdNum,
          from,
          to,
          status: [1, 2],
          tradingStatus: 0,
        });
        if (runId !== upcomingHydrateRunRef.current) return;

        const sportRow = res.data?.find((s) => s[0] === sportIdNum) ?? res.data?.[0];
        const entries: LeagueEntry[] = [];
        for (const region of sportRow?.[2] ?? []) {
          const regionId = region[0];
          for (const league of region[2] ?? []) {
            const leagueId = league[0];
            const eventIds = (league[2] ?? [])
              .map((id) => Number(id))
              .filter((id) => Number.isFinite(id) && id > 0);
            if (eventIds.length === 0) continue;
            entries.push({
              key: leagueBucketKey({
                sportId: sportIdNum,
                regionId,
                leagueId,
              }),
              sportId: sportIdNum,
              regionId,
              leagueId,
              eventIds,
              outrightIds: [],
              matchCount: eventIds.length,
            });
          }
        }
        const sortedEntries = sortLeagues(entries, sportName, sportIdNum);
        if (runId !== upcomingHydrateRunRef.current) return;
        setUpcomingLeagueEntries(sortedEntries);

        const allIds = sortedEntries.flatMap((e) => e.eventIds);
        const unique = [...new Set(allIds)];
        const missing = unique.filter(
          (id) => !storeState.value[id]?.value?.startTime,
        );
        const chunks: number[][] = [];
        for (let i = 0; i < missing.length; i += UPCOMING_MATCH_IDS_CHUNK) {
          chunks.push(missing.slice(i, i + UPCOMING_MATCH_IDS_CHUNK));
        }
        const results = await Promise.all(
          chunks.map((slice) => apiGetMatches(slice)),
        );
        if (runId !== upcomingHydrateRunRef.current) return;
        for (const matches of results) {
          (matches ?? []).forEach((event) => storeEvent(event));
        }
      } catch (e) {
        console.error("SportPage upcoming load:", e);
        if (runId === upcomingHydrateRunRef.current) {
          setUpcomingLeagueEntries([]);
        }
      } finally {
        if (runId === upcomingHydrateRunRef.current) {
          setUpcomingHydrateLoading(false);
        }
      }
    })();
  }, [
    activeTab,
    sportName,
    sportIdNum,
    loadedSidebarState.value,
    upcomingWindowHours,
  ]);

  const tabStyle = (tab: string) =>
    `flex-1 py-2 text-center text-[10px] font-medium transition ${
      activeTab === tab
        ? "bg-blue-600 text-white rounded-full"
        : "text-[var(--text-sub-color)]"
    }`;

  useEffect(() => {
    if (!loadedSidebarState.value) return;
    fetchLeagueMatches();
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
            leagueLabelMap={leagueLabelMap}
            selectedLeagueKey={selectedLeagueKey}
            setSelectedLeagueKey={setSelectedLeagueKey}
            sportId={sportIdNum}
            sportName={sportName}
            selectedCategory={selectedCategory}
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
            sportId={sportIdNum}
            leagueEntries={leagueEntries}
            leagueLabelMap={leagueLabelMap}
          />
        );

      case "upcoming":
        return (
          <UpcomingRender
            leagueEntries={upcomingLeagueEntries}
            leagueLabelMap={leagueLabelMap}
            selectedLeagueKey={selectedLeagueKey}
            setSelectedLeagueKey={setSelectedLeagueKey}
            sportId={sportIdNum}
            sportName={sportName}
            selectedCategory={selectedCategory}
            selectedLeagueEntry={selectedLeagueEntry}
            loading={upcomingHydrateLoading}
            windowHours={upcomingWindowHours}
            onWindowHoursChange={setUpcomingWindowHours}
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
          items={[{ label: "Home", href: "/event-view" }, { label: sportName }]}
        />
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-[12px] uppercase tracking-[0.28em] text-[var(--text-sub-color)] font-semibold">
              {sportName} sport page
            </span>
            <div className={`flex gap-[4px] flex-1 min-w-0 items-center`}>
              <div className="w-[24px] h-full shrink-0">
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${sportIdNum}.svg`}
                  onError={(e) => {
                    e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
                  }}
                  className={`w-[24px] h-[24px] ${baseTheme === "dark" ? "invert" : ""}`}
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
