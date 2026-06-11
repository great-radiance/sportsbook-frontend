import { FunctionComponent } from "preact";
import { useEffect, useState, useCallback, useMemo } from "preact/hooks";
import { useRouteParams } from "@/hooks/useRotueParams";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { baseColorTheme } from "@/state/baseColorTheme";
import HighlightRender from "@/app/components/SportPage/HighlightRender";
import { storeEvent } from "@/helpers/storeEvent";
import { summarySportsState } from "@/state/summarySports";
import { findSportNode } from "@/helpers/findSidebarNodeByRoute";
import { apiGetMatchesByNode } from "@/api/matches/apiGetMatchesByNode";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import CompetitionsRender from "@/app/components/SportPage/CompetitionsRender";
import UpcomingRender from "@/app/components/SportPage/UpcomingRender";
import { apiGetUpcomingBySport } from "@/api/matches/apiGetUpcomingBySport";
import {
  extractUpcomingLeagueEntries,
  sortUpcomingLeaguesBySidebar,
  type UpcomingLeagueEntry,
} from "@/helpers/upcomingSportCatalog";

export const SportPage: FunctionComponent = () => {
  const { sportName, sportIdParam, regionName } = useRouteParams();
  const [loading, setLoading] = useState(true);
  const [selectedLeagueKey, setSelectedLeagueKey] = useState<string>("");
  const baseTheme = baseColorTheme.value;
  const [activeTab, setActiveTab] = useState<string>("highlights");
  const [matches, setMatches] = useState<{
    pre: number[];
    outright: number[];
    live: number[];
  }>({
    pre: [],
    outright: [],
    live: [],
  });
  const [upcomingLeagues, setUpcomingLeagues] = useState<UpcomingLeagueEntry[]>(
    [],
  );
  const [upcomingLoading, setUpcomingLoading] = useState(false);

  const tabStyle = (tab: string) =>
    `flex-1 py-2 text-center text-[10px] font-medium transition ${
      activeTab === tab
        ? "bg-[var(--highlight-background)] text-white rounded-full"
        : "text-[var(--text-sub-color)]"
    }`;

  const sportNode = useMemo(
    () => findSportNode(summarySportsState.value, sportIdParam ?? ""),
    [summarySportsState.value, sportIdParam],
  );

  const featuredLeaguesOfSport = useMemo(
    () =>
      sportNode?.children?.filter(
        (child) => child.type === "league" || child.type === "combined_league",
      ) ?? [],
    [sportNode],
  );

  useEffect(() => {
    if (regionName === "upcoming") {
      setActiveTab("upcoming");
      return;
    }
    if (featuredLeaguesOfSport.length === 0) {
      setActiveTab("competitions");
      setSelectedLeagueKey("");
      return;
    }
    setActiveTab("highlights");
    setSelectedLeagueKey((prev) => {
      if (prev && featuredLeaguesOfSport.some((league) => league.id === prev)) {
        return prev;
      }
      return featuredLeaguesOfSport[0].id;
    });
  }, [featuredLeaguesOfSport, regionName]);

  const selectedLeagueNode = useMemo(
    () =>
      featuredLeaguesOfSport.find((child) => child.id === selectedLeagueKey),
    [selectedLeagueKey, featuredLeaguesOfSport],
  );

  const fetchLeagueMatches = useCallback(async () => {
    if (!selectedLeagueNode?.id) {
      setMatches({ pre: [], outright: [], live: [] });
      return;
    }

    const response = await apiGetMatchesByNode(selectedLeagueNode.id, false);

    response.pre.sort(
      (a, b) =>
        new Date(a.eventInfo.startTime).getTime() -
        new Date(b.eventInfo.startTime).getTime(),
    );
    response.outright.sort(
      (a, b) =>
        new Date(a.eventInfo.startTime).getTime() -
        new Date(b.eventInfo.startTime).getTime(),
    );

    for (const match of response.pre) {
      storeEvent(match);
    }
    for (const match of response.outright) {
      storeEvent(match);
    }
    for (const match of response.live) {
      storeEvent(match);
    }

    setMatches({
      pre: response.pre.map((match) => match.eventInfo.id),
      outright: response.outright.map((match) => match.eventInfo.id),
      live: response.live.map((match) => match.eventInfo.id),
    });
  }, [selectedLeagueNode?.id]);

  useEffect(() => {
    if (!loadedSidebarState.value) return;

    if (!selectedLeagueNode?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        await fetchLeagueMatches();
      } catch (error) {
        console.error("Error fetching sport page matches:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedLeagueNode?.id, fetchLeagueMatches, loadedSidebarState.value]);

  const fetchUpcomingMatches = useCallback(async () => {
    if (activeTab !== "upcoming") return;
    setUpcomingLoading(true);
    try {
      const response = await apiGetUpcomingBySport(
        Math.floor(new Date().getTime() / 1000),
        Math.floor(new Date().getTime() / 1000 + 60 * 60 * 24),
        parseInt(sportIdParam ?? "0"),
      );

      const entries = extractUpcomingLeagueEntries(response);
      setUpcomingLeagues(sortUpcomingLeaguesBySidebar(entries, sportNode));
    } catch (error) {
      console.error("Error fetching upcoming matches:", error);
      setUpcomingLeagues([]);
    } finally {
      setUpcomingLoading(false);
    }
  }, [sportIdParam, activeTab, sportNode]);

  useEffect(() => {
    if (!loadedSidebarState.value) return;
    if (!sportIdParam) return;
    void fetchUpcomingMatches();
  }, [fetchUpcomingMatches, loadedSidebarState.value]);

  if (!sportName) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "highlights":
        return (
          <HighlightRender
            leagueEntries={featuredLeaguesOfSport}
            selectedLeagueKey={selectedLeagueKey}
            setSelectedLeagueKey={setSelectedLeagueKey}
            sportId={Number(sportIdParam)}
            sportName={sportName}
            loading={loading}
            matches={matches}
            markets={sportNode?.markets ?? []}
          />
        );

      case "competitions":
        return (
          <CompetitionsRender
            sportNode={sportNode}
            sportName={sportName}
            sportId={Number(sportIdParam) || 0}
          />
        );

      case "upcoming":
        return (
          <UpcomingRender leagues={upcomingLeagues} loading={upcomingLoading} />
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
                  src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${sportIdParam}.svg`}
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
        {featuredLeaguesOfSport.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("highlights")}
            className={tabStyle("highlights")}
          >
            Highlights
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab("competitions")}
          className={tabStyle("competitions")}
        >
          Competitions
        </button>
        <button
          type="button"
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
