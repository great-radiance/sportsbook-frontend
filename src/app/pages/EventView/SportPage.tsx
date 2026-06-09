import { FunctionComponent } from "preact";
import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "preact/hooks";
import { useRouteParams } from "@/hooks/useRotueParams";
import { UpcomingMatchSkeleton } from "@/app/components/Loading";
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
import { summarySportsState } from "@/state/summarySports";
import { sortLeagues } from "@/helpers/sortLeagues";
import { buildLeagueLabelMap } from "@/helpers/resolveSummaryLabels";
import { leagueBucketKey } from "@/helpers/summaryIds";
import {
  findLeagueInRegion,
  findRegionNode,
  findSportNode,
} from "@/helpers/findSidebarNodeByRoute";
import { apiGetLeagues } from "@/api/entities/apiGetLeagues";
import { apiGetMatchesByNode } from "@/api/matches/apiGetMatchesByNode";
import { sidebarNode } from "@/api/sidebar/apiGetSidebar";

export const SportPage: FunctionComponent = () => {
  const {
    sportName,
    sportIdParam,
    regionName,
    regionIdParam,
    leagueName,
    leagueIdParam,
  } = useRouteParams();
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

  const tabStyle = (tab: string) =>
    `flex-1 py-2 text-center text-[10px] font-medium transition ${
      activeTab === tab
        ? "bg-[var(--highlight-background)] text-white rounded-full"
        : "text-[var(--text-sub-color)]"
    }`;
  const node = useMemo(() => {
    return findSportNode(summarySportsState.value, sportIdParam ?? "");
  }, [summarySportsState.value, sportIdParam]);

  const featuredLeaguesOfSport = useMemo(() => {
    return node?.children?.filter(
      (child) => child.type === "league" || child.type === "combined_league",
    );
  }, [node]);

  console.log("featuredLeaguesOfSportTest", featuredLeaguesOfSport);
  useEffect(() => {
    setSelectedLeagueKey(featuredLeaguesOfSport?.[0]?.id ?? "");
  }, [featuredLeaguesOfSport]);

  const selectedLeagueNode = useMemo(() => {
    const league = featuredLeaguesOfSport?.find(
      (child) => child.id === selectedLeagueKey,
    );
    const regionNode = findRegionNode(
      node?.children ?? [],
      league?.region?.id?.toString() ?? "",
    );
    return findLeagueInRegion(
      regionNode as sidebarNode,
      league?.leagueId?.toString() ?? "",
    );
  }, [selectedLeagueKey, node, featuredLeaguesOfSport]);

  const getLeagueMathces = useCallback(async () => {
    const response = await apiGetMatchesByNode(selectedLeagueNode?.id ?? "");
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
    const sortedPreIds = response.pre.map((match) => match.eventInfo.id);
    const sortedOutrightIds = response.outright.map(
      (match) => match.eventInfo.id,
    );
    const sortedLiveIds = response.live.map((match) => match.eventInfo.id);

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
      pre: sortedPreIds,
      outright: sortedOutrightIds,
      live: sortedLiveIds,
    });
    setLoading(false);
  }, [selectedLeagueNode, summarySportsState.value]);

  useEffect(() => {
    getLeagueMathces();
  }, [selectedLeagueKey]);

  useEffect(() => {
    console.log("matchesTest", matches);
  }, [matches]);

  if (!sportName) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "highlights":
        return (
          <HighlightRender
            leagueEntries={featuredLeaguesOfSport ?? []}
            selectedLeagueKey={selectedLeagueKey ?? ""}
            setSelectedLeagueKey={setSelectedLeagueKey}
            sportId={Number(sportIdParam)}
            sportName={sportName}
            loading={loading}
            matches={matches}
          />
        );

      // case "competitions":
      //   return (
      //     <CompetitionsRender
      //       data={competitionsTree}
      //       sportName={sportName}
      //       sportId={sportIdNum}
      //       leagueEntries={leagueEntries}
      //       leagueLabelMap={leagueLabelMap}
      //     />
      //   );

      // case "upcoming":
      //   return (
      //     <UpcomingRender
      //       leagueEntries={upcomingLeagueEntries}
      //       leagueLabelMap={leagueLabelMap}
      //       selectedLeagueKey={selectedLeagueKey}
      //       setSelectedLeagueKey={setSelectedLeagueKey}
      //       sportId={sportIdNum}
      //       sportName={sportName}
      //       selectedCategory={selectedCategory}
      //       selectedLeagueEntry={selectedLeagueEntry}
      //       loading={upcomingHydrateLoading}
      //       windowHours={upcomingWindowHours}
      //       onWindowHoursChange={setUpcomingWindowHours}
      //       BASE_ASSET_PUBLIC_URL={BASE_ASSET_PUBLIC_URL}
      //       getFlagIconFromregionName={getFlagIconFromregionName}
      //     />
      //   );
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
