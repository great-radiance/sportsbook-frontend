import { FunctionComponent } from "preact";
import { useEffect, useState, useCallback, useMemo } from "preact/hooks";
import { useRouteParams } from "@/hooks/useRotueParams";
import { outRightSummarySports, summarySports } from "@/state/summarySports";
import { Match } from "./components/Match";
import { UpcomingMatchSkeleton } from "../Loading";
import { apiGetMatches } from "@/api/matches/apiGetMatches";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { HorizontalTabs } from "../HorizontalTabs";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { MarketNavigation } from "../marketNavigation";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { sortEventIdsByStartDate } from "@/helpers/sortEventIdsByStartDate";
import { sortLeagueNames } from "@/helpers/sortLeagues";
import { storeEvent } from "@/helpers/storeEvent";
import { MatchDataResponse } from "@/api/matches/apiGetMatchData";
import { storeState } from "@/state/storeState";
import { useSidebarMarketNavigation } from "@/hooks/useSidebarMarketNavigation";
import {
  eventHasMarketType,
  isMoneylineSport,
} from "@/helpers/sidebarMarketNavigation";
import { MoneylineMatch } from "./components/Match/MoneylineMatch";

const CATEGORIES = ["Matches", "Outright"] as const;

export const RegionMatchesBoard: FunctionComponent = () => {
  const { sportName, sportIdParam, regionName, regionIdParam } =
    useRouteParams();
  const [selectedCategory, setSelectedCategory] = useState<string>("Matches");
  const [loading, setLoading] = useState(true);
  const sportId = Number(sportIdParam) || 0;
  const regionData = summarySports.value?.data
    ?.find((s) => s[0] === Number(sportIdParam))?.[2]
    ?.find((r) => r[0] === Number(regionIdParam))?.[2];
  const regionLeagues = useMemo(() => {
    const test = regionData;
    // return sortLeagueNames(test || [], sportName || "");
    return test || [];
  }, [regionData, sportIdParam, regionIdParam]);

  const [selectedLeague, setSelectedLeague] = useState<number>(0);

  useEffect(() => {
    if (regionLeagues.length > 0 && !selectedLeague) {
      setSelectedLeague(regionLeagues[0]?.[0] || 0);
    }
    if (
      regionLeagues.length > 0 &&
      !regionLeagues.some((l) => l[0] === selectedLeague)
    ) {
      setSelectedLeague(regionLeagues[0]?.[0] || 0);
    }
  }, [regionLeagues, selectedLeague]);

  const eventIdsForSelectedLeague = useMemo((): number[] => {
    if (!sportIdParam || !regionIdParam || !selectedLeague) return [];
    const leagueMatches = summarySports.value?.data
      ?.find((s) => s[0] === Number(sportIdParam))?.[2]
      ?.find((r) => r[0] === Number(regionIdParam))?.[2]
      ?.find((l) => l[0] === selectedLeague)?.[2];
    return sortEventIdsByStartDate(leagueMatches || []);
  }, [sportName, regionName, selectedLeague]);

  const outrightEventIdsForSelectedLeague = useMemo((): number[] => {
    if (!sportIdParam || !regionIdParam || !selectedLeague) return [];
    const leagueOutrights = outRightSummarySports.value?.data
      ?.find((s) => s[0] === Number(sportIdParam))?.[2]
      ?.find((r) => r[0] === Number(regionIdParam))?.[2]
      ?.find((l) => l[0] === selectedLeague)?.[2];
    return sortEventIdsByStartDate(leagueOutrights || []);
  }, [
    sportIdParam,
    regionIdParam,
    selectedLeague,
    outRightSummarySports.value,
  ]);

  const regionLeaguesKey = regionLeagues.join(",");

  const loadedEventsForMarkets = useMemo(() => {
    const ids =
      selectedCategory === "Matches"
        ? eventIdsForSelectedLeague
        : outrightEventIdsForSelectedLeague;
    return ids.map((id) => storeState.value[id]?.value).filter(Boolean);
  }, [
    selectedCategory,
    eventIdsForSelectedLeague,
    outrightEventIdsForSelectedLeague,
    storeState.value,
  ]);

  const {
    marketOptions,
    showMarketNav,
    selectedMarketType,
    setSelectedMarketType,
    matchMarketType,
    allowAutoSelect,
  } = useSidebarMarketNavigation({
    sportId,
    sportName: String(
      summarySports.value.data?.find((s) => s[0] === sportId)?.[1] ?? "",
    ),
    loadedEvents: loadedEventsForMarkets,
  });

  const fetchAndStoreAllLeagues = useCallback(async () => {
    if (!sportName || !regionName || regionLeagues.length === 0) return;
    setLoading(true);
    try {
      const matchPromises = regionLeagues.map((league) => {
        const leagueMatches = summarySports.value?.data
          ?.find((s) => s[0] === Number(sportIdParam))?.[2]
          ?.find((r) => r[0] === Number(regionIdParam))?.[2]
          ?.find((l) => l[0] === league?.[0])?.[2];
        const ids = leagueMatches;
        if (ids?.length === 0)
          return Promise.resolve({
            data: [],
            marketsMeta: [],
          } as unknown as Awaited<ReturnType<typeof apiGetMatches>>);
        return apiGetMatches(ids || []);
      });

      const outrightEventIds = regionLeagues.flatMap((league) => {
        const leagueOutrights = outRightSummarySports.value?.data
          ?.find((s) => s[0] === Number(sportIdParam))?.[2]
          ?.find((r) => r[0] === Number(regionIdParam))?.[2]
          ?.find((l) => l[0] === league?.[0])?.[2];
        return leagueOutrights || [];
      });
      console.log("outrightEventIds", outrightEventIds);

      const [matchResults, outrightResults] = await Promise.all([
        Promise.all(matchPromises),
        apiGetMatches(outrightEventIds),
      ]);
      const marketsMetaTemp: Record<string, string[]> = {};
      // const outrightMetaTemp: Record<string, string[]> = {};
      matchResults.forEach((events: MatchDataResponse[], index) => {
        const league = regionLeagues[index];
        events.forEach((event) => {
          storeEvent(event);
        }); // marketsMetaTemp[league] = events.marketsMeta;
      });
      outrightResults.forEach((event: MatchDataResponse, index) => {
        storeEvent(event);
      });
      // outrightResults.forEach((events, index) => {
      //   const league = regionLeagues[index];
      //   convertAndStoreEvent(
      //     events.data.sort(
      //       (a, b) => (a[9] ?? 0) - (b[9] ?? 0),
      //     ) as unknown as responseEvent[],
      //   );
      //   outrightMetaTemp[league] = events.marketsMeta;
      // });
    } catch (error) {
      console.error("Error fetching region matches board:", error);
    } finally {
      setLoading(false);
    }
  }, [sportName, regionName, regionLeaguesKey]);

  useEffect(() => {
    if (!sportName || !regionName || regionLeagues.length === 0) {
      setLoading(false);
      return;
    }
    fetchAndStoreAllLeagues();
  }, [fetchAndStoreAllLeagues]);

  useEffect(() => {
    if (
      !sportName ||
      !regionName ||
      regionLeagues.length === 0 ||
      !loadedSidebarState.value
    )
      return;
    fetchAndStoreAllLeagues();
  }, [loadedSidebarState.value]);

  return (
    <div
      className={`relative flex flex-col w-full h-full shadow-[-4px_4px_4px_rgba(0,0,0,0.1)] text-[var(--text-basic-color)] my-2 rounded-lg`}
    >
      <div className="flex sticky top-0 z-[200] bg-[var(--background-element)] flex-col w-full p-2 gap-2 rounded-b-[16px]">
        {/* League tab list */}
        {/* League tab list */}
        <nav role="tablist" aria-label="Leagues" className="w-full">
          <HorizontalTabs scrollerClassName="py-1">
            {regionLeagues.map((league) => {
              const isSelected = selectedLeague === league?.[0];
              return (
                <button
                  key={league?.[0]}
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  title={league?.[1]}
                  className={[
                    "flex shrink-0 px-4 py-2 gap-2 items-center rounded-lg text-[12px] transition-colors",
                    "whitespace-nowrap", // IMPORTANT
                    isSelected
                      ? "bg-[var(--highlight-background)] font-bold border-[2px] border-[var(--border-color)]"
                      : "bg-[var(--sub-element-secondary)] hover:bg-[var(--highlight-background)]",
                  ].join(" ")}
                  onClick={() => setSelectedLeague(league?.[0] || 0)}
                  style={{
                    order: league?.[0] || 999,
                    // orderConfigState.value[sportName || ""]?.regions?.[
                    //   regionName || ""
                    // ]?.leagues?.[league?.[1] || ""]?.order || 999,
                  }}
                >
                  <div className="flex items-center justify-center w-6 h-6 bg-white/90 rounded-[4px]">
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/logo/leagues/${encodeURIComponent(sportName || "")}/${encodeURIComponent(regionName || "")}/${encodeURIComponent(league?.[1] || "")}.webp`}
                      className={`w-5 h-5 object-contain`}
                      onError={(e) => {
                        e.currentTarget.src = `${getFlagIconFromregionName(regionName || "")}`;
                        e.currentTarget.className = "rounded-full w-4 h-4";
                      }}
                      alt={league?.[1] || ""}
                    />
                  </div>
                  {league?.[1]}
                  {/* {getTranslatedText(league)} */}
                </button>
              );
            })}
          </HorizontalTabs>
        </nav>

        <HorizontalTabs>
          {CATEGORIES.map((category: string) => (
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

        {showMarketNav ? (
          <MarketNavigation
            options={marketOptions}
            selectedValue={selectedMarketType}
            onSelect={setSelectedMarketType}
          />
        ) : null}
      </div>

      <div className="flex flex-col w-full rounded-[8px] overflow-hidden">
        {loading ? (
          <div className="flex flex-col w-full gap-[2px] mt-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <UpcomingMatchSkeleton key={`match-${index}`} />
            ))}
          </div>
        ) : selectedCategory === "Matches" ? (
          eventIdsForSelectedLeague.map((eventId: number) => {
            const stored = storeState.value[eventId]?.value;
            if (
              showMarketNav &&
              stored &&
              !isMoneylineSport(sportId, sportName) &&
              !eventHasMarketType(stored, selectedMarketType)
            ) {
              return null;
            }
            const isMoneyline =
              stored &&
              isMoneylineSport(
                stored.sport?.id ?? sportId,
                stored.sport?.name,
              );
            return (
              <div key={eventId}>
                {isMoneyline ? (
                  <MoneylineMatch eventId={eventId} />
                ) : (
                  <Match
                    eventId={eventId}
                    marketType={matchMarketType}
                    allowAutoSelect={allowAutoSelect}
                  />
                )}
              </div>
            );
          })
        ) : outrightEventIdsForSelectedLeague.length === 0 ? (
          <span className="flex items-center justify-center w-full py-4 text-[12px] text-[var(--text-sub-color)]">
            There is no outright for this competition
          </span>
        ) : (
          outrightEventIdsForSelectedLeague.map((eventId: number) => (
            <Match
              key={eventId}
              eventId={eventId}
              marketType={matchMarketType}
              allowAutoSelect={allowAutoSelect}
            />
          ))
        )}
      </div>
    </div>
  );
};
