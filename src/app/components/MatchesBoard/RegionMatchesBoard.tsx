import { FunctionComponent } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { useRouteParams } from "@/hooks/useRotueParams";
import { Match } from "./components/Match";
import { UpcomingMatchSkeleton } from "../Loading";
import { HorizontalTabs } from "../HorizontalTabs";
import { BASE_ASSET_PUBLIC_URL, getAppConfig } from "@/shared/config/appConfig";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { storeEvent } from "@/helpers/storeEvent";
import { isMoneylineSport } from "@/helpers/sidebarMarketNavigation";
import { MoneylineMatch } from "./components/Match/MoneylineMatch";
import { RacingMatch } from "./components/Match/RacingMatch";
import { isRacingSport } from "@/helpers/isRacingSport";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import {
  findLeagueInRegion,
  findRegionNode,
  findSportNode,
  getLeagueId,
} from "@/helpers/findSidebarNodeByRoute";
import { apiGetMatchesByNode } from "@/api/matches/apiGetMatchesByNode";
import type { sidebarNode } from "@/api/sidebar/apiGetSidebar";

const isLeagueNode = (node: sidebarNode): boolean =>
  node.type === "league" || node.type === "combined_league";

export const RegionMatchesBoard: FunctionComponent = () => {
  const { loadedSidebarState, storeState, summarySportsState } =
    useSportsbookStore();
  const { sportIdParam, regionName, regionIdParam } = useRouteParams();
  const [selectedCategory, setSelectedCategory] = useState<string>("Matches");
  const [loading, setLoading] = useState(true);
  const sportId = Number(sportIdParam) || 0;
  const [selectedLeague, setSelectedLeague] = useState<string>("");
  const lang = getAppConfig().lang;

  const regionNode = useMemo(() => {
    const sportNode = findSportNode(
      summarySportsState.value,
      sportIdParam ?? "",
    );
    if (!sportNode) return undefined;
    return findRegionNode(sportNode.children, regionIdParam ?? "");
  }, [sportIdParam, regionIdParam, summarySportsState.value]);

  const leagueNodes = useMemo(
    () => (regionNode?.children ?? []).filter(isLeagueNode),
    [regionNode],
  );

  useEffect(() => {
    if (leagueNodes.length === 0) {
      setSelectedLeague("");
      setLoading(false);
      return;
    }

    setSelectedLeague((prev) => {
      if (prev && leagueNodes.some((league) => getLeagueId(league) === prev)) {
        return prev;
      }
      return getLeagueId(leagueNodes[0]);
    });
  }, [leagueNodes, regionIdParam]);

  const selectedLeagueNode = useMemo(() => {
    if (!regionNode || !selectedLeague) return undefined;
    return findLeagueInRegion(regionNode, selectedLeague);
  }, [regionNode, selectedLeague]);

  const categories = useMemo(() => {
    const cats: string[] = [];
    if (selectedLeagueNode?.pre?.length) cats.push("Matches");
    if (selectedLeagueNode?.outright?.length) cats.push("Outright");
    return cats;
  }, [selectedLeagueNode]);

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    if (!loadedSidebarState.value || !selectedLeagueNode?.id) {
      if (!leagueNodes.length) setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await apiGetMatchesByNode(selectedLeagueNode.id);
        if (cancelled) return;
        for (const event of res?.pre ?? []) {
          storeEvent(event);
        }
        for (const event of res?.outright ?? []) {
          storeEvent(event);
        }
      } catch (error) {
        console.error("Error fetching region matches:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedLeagueNode?.id, loadedSidebarState.value, leagueNodes.length]);

  const renderMatch = (eventId: number) => {
    const stored = storeState.value[eventId]?.value;
    const isRacing =
      stored && isRacingSport(stored.sport?.id ?? sportId, stored.sport?.name);
    const isMoneyline =
      stored &&
      isMoneylineSport(stored.sport?.id ?? sportId, stored.sport?.name);

    if (!stored) {
      return <UpcomingMatchSkeleton key={eventId} />;
    }

    if (isRacing) {
      return <RacingMatch key={eventId} eventId={eventId} />;
    }
    if (isMoneyline) {
      return <MoneylineMatch key={eventId} eventId={eventId} />;
    }
    return <Match key={eventId} eventId={eventId} allowAutoSelect={true} />;
  };

  return (
    <div
      className={`relative flex flex-col w-full h-full shadow-[-4px_4px_4px_rgba(0,0,0,0.1)] text-[var(--text-basic-color)] my-2 rounded-lg`}
    >
      <div className="flex sticky top-0 z-[200] bg-[var(--background-element)] flex-col w-full p-2 gap-2 rounded-b-[16px]">
        <nav role="tablist" aria-label="Leagues" className="w-full">
          <HorizontalTabs scrollerClassName="py-1">
            {leagueNodes.map((league) => {
              const leagueId = getLeagueId(league);
              const isSelected = selectedLeague === leagueId;
              const translatedName = league.name;

              return (
                <button
                  key={league.id}
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  className={[
                    "flex shrink-0 px-4 py-2 gap-2 items-center rounded-lg text-[12px] transition-colors",
                    "whitespace-nowrap",
                    isSelected
                      ? "bg-[var(--highlight-background)] font-bold border-[2px] border-[var(--border-color)]"
                      : "bg-[var(--sub-element-secondary)] hover:bg-[var(--highlight-background)]",
                  ].join(" ")}
                  onClick={() => setSelectedLeague(leagueId)}
                  style={{ order: league.order || 999 }}
                >
                  <div className="flex items-center justify-center w-6 h-6 bg-white/90 rounded-[4px]">
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/logo/leagueById/${sportId}/${leagueId}.webp`}
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = getFlagIconFromregionName(
                          regionName || "",
                        );
                        e.currentTarget.className = "rounded-full w-4 h-4";
                      }}
                      alt={translatedName || ""}
                    />
                  </div>
                  {translatedName}
                </button>
              );
            })}
          </HorizontalTabs>
        </nav>

        {categories.length > 0 ? (
          <HorizontalTabs>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`px-4 py-[6px] text-[12px] font-bold ${selectedCategory === category ? "bg-white rounded-full text-black" : ""}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </HorizontalTabs>
        ) : null}
      </div>

      <div className="flex flex-col w-full rounded-[8px] overflow-hidden">
        {loading ? (
          <div className="flex flex-col w-full gap-[2px] mt-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <UpcomingMatchSkeleton key={`match-${index}`} />
            ))}
          </div>
        ) : leagueNodes.length === 0 ? (
          <span className="flex items-center justify-center w-full py-4 text-[12px] text-[var(--text-sub-color)]">
            No leagues available for this region
          </span>
        ) : selectedCategory === "Matches" ? (
          selectedLeagueNode?.pre?.length ? (
            selectedLeagueNode.pre.map((eventId) => renderMatch(eventId))
          ) : (
            <span className="flex items-center justify-center w-full py-4 text-[12px] text-[var(--text-sub-color)]">
              There are no matches for this competition
            </span>
          )
        ) : selectedLeagueNode?.outright?.length ? (
          selectedLeagueNode.outright.map((eventId) => (
            <Match key={eventId} eventId={eventId} allowAutoSelect={true} />
          ))
        ) : (
          <span className="flex items-center justify-center w-full py-4 text-[12px] text-[var(--text-sub-color)]">
            There is no outright for this competition
          </span>
        )}
      </div>
    </div>
  );
};
