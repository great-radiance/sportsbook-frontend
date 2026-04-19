import { FunctionComponent } from "preact";
import { useEffect, useState, useCallback, useMemo } from "preact/hooks";
import { useRouteParams } from "@/hooks/useRotueParams";
import { outRightSummarySports, summarySports } from "@/state/summarySports";
import { orderConfigState } from "@/state/orderConfigState";
import { Match } from "./components/Match";
import { UpcomingMatchSkeleton } from "../Loading";
import { apiGetMatches, responseEvent } from "@/api/matches/apiGetMatches";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { HorizontalTabs } from "../HorizontalTabs";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { getTranslatedText } from "@/helpers/getTranslate";
import { MarketNavigation } from "../marketNavigation";
import { convertAndStoreEvent } from "@/helpers/convertAndStoreEvent";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { apiGetOutrightMatchs } from "@/api/matches/apiGetOutrightMatchs";
import { storeState } from "@/state/storeState";
import { sortEventIdsByStartDate } from "@/helpers/sortEventIdsByStartDate";
import { sortLeagueNames } from "@/helpers/sortLeagues";

const CATEGORIES = ["Matches", "Outright"] as const;

export const RegionMatchesBoard: FunctionComponent = () => {
  const { sportName, regionName } = useRouteParams();
  const [selectedCategory, setSelectedCategory] = useState<string>("Matches");
  const [selectedMarketSlug, setSelectedMarketSlug] =
    useState<string>("Winner");
  const [loading, setLoading] = useState(true);
  const [selectedMarkets, setSelectedMarkets] = useState<
    Record<string, string[]>
  >({});
  const [outrightMarketsByLeague, setOutrightMarketsByLeague] = useState<
    Record<string, string[]>
  >({});
  const regionData =
    summarySports.value?.data?.[sportName || ""]?.[regionName || ""];
  const regionLeagues = useMemo(() => {
    const test = Object.keys(regionData || {});
    return sortLeagueNames(test, sportName);
  }, [regionData]);

  const [selectedLeague, setSelectedLeague] = useState<string>("");

  useEffect(() => {
    if (regionLeagues.length > 0 && !selectedLeague) {
      setSelectedLeague(regionLeagues[0]);
    }
    if (regionLeagues.length > 0 && !regionLeagues.includes(selectedLeague)) {
      setSelectedLeague(regionLeagues[0]);
    }
  }, [regionLeagues, selectedLeague]);

  const eventIdsForSelectedLeague = useMemo((): number[] => {
    if (!sportName || !regionName || !selectedLeague) return [];
    const leagueMatches =
      summarySports.value?.data?.[sportName]?.[regionName]?.[selectedLeague] ||
      {};
    return sortEventIdsByStartDate(
      Object.values(leagueMatches).map((m) => m[0]),
    );
  }, [sportName, regionName, selectedLeague]);

  const outrightEventIdsForSelectedLeague = useMemo((): number[] => {
    if (!sportName || !regionName || !selectedLeague) return [];
    const leagueOutrights =
      outRightSummarySports.value?.[sportName]?.[regionName]?.[
        selectedLeague
      ] || {};
    return sortEventIdsByStartDate(
      Object.values(leagueOutrights).map((m) => m[0]),
    );
  }, [sportName, regionName, selectedLeague, outRightSummarySports.value]);

  const regionLeaguesKey = regionLeagues.join(",");

  const fetchAndStoreAllLeagues = useCallback(async () => {
    if (!sportName || !regionName || regionLeagues.length === 0) return;
    setLoading(true);
    try {
      const matchPromises = regionLeagues.map((league) => {
        const leagueMatches =
          summarySports.value?.data?.[sportName]?.[regionName]?.[league] || {};
        const ids = Object.values(leagueMatches).map((m) => m[0]);
        if (ids.length === 0)
          return Promise.resolve({ data: [], marketsMeta: [] } as Awaited<
            ReturnType<typeof apiGetMatches>
          >);
        return apiGetMatches(ids, "PreMatch", sportName || "").then((res) => ({
          data: res.data.sort((a, b) => (a[9] ?? 0) - (b[9] ?? 0)),
          marketsMeta: res.marketsMeta,
        }));
      });
      const outrightPromises = regionLeagues.map((league) => {
        const leagueOutrights =
          outRightSummarySports.value?.[sportName]?.[regionName]?.[league] ||
          {};
        const ids = Object.values(leagueOutrights).map((m) => m[0]);
        if (ids.length === 0)
          return Promise.resolve({ data: [], marketsMeta: [] } as Awaited<
            ReturnType<typeof apiGetOutrightMatchs>
          >);
        return apiGetOutrightMatchs(ids).then((res) => ({
          data: res.data.sort((a, b) => (a[9] ?? 0) - (b[9] ?? 0)),
          marketsMeta: res.marketsMeta,
        }));
      });
      const [matchResults, outrightResults] = await Promise.all([
        Promise.all(matchPromises),
        Promise.all(outrightPromises),
      ]);
      const marketsMetaTemp: Record<string, string[]> = {};
      const outrightMetaTemp: Record<string, string[]> = {};
      matchResults.forEach((events, index) => {
        const league = regionLeagues[index];
        convertAndStoreEvent(
          events.data.sort((a, b) => (a[9] ?? 0) - (b[9] ?? 0)),
        );
        marketsMetaTemp[league] = events.marketsMeta;
      });
      outrightResults.forEach((events, index) => {
        const league = regionLeagues[index];
        convertAndStoreEvent(
          events.data.sort(
            (a, b) => (a[9] ?? 0) - (b[9] ?? 0),
          ) as unknown as responseEvent[],
        );
        outrightMetaTemp[league] = events.marketsMeta;
      });
      setSelectedMarkets(marketsMetaTemp);
      setOutrightMarketsByLeague(outrightMetaTemp);
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
              const isSelected = selectedLeague === league;
              return (
                <button
                  key={league}
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  title={league}
                  className={[
                    "flex shrink-0 px-4 py-2 gap-2 items-center rounded-lg text-[12px] transition-colors",
                    "whitespace-nowrap", // IMPORTANT
                    isSelected
                      ? "bg-[var(--highlight-background)] font-bold border-[2px] border-[var(--border-color)]"
                      : "bg-[var(--sub-element-secondary)] hover:bg-[var(--highlight-background)]",
                  ].join(" ")}
                  onClick={() => setSelectedLeague(league)}
                  style={{
                    order:
                      orderConfigState.value[sportName || ""]?.regions?.[
                        regionName || ""
                      ]?.leagues?.[league || ""]?.order || 999,
                  }}
                >
                  <div className="flex items-center justify-center w-6 h-6 bg-white/90 rounded-[4px]">
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/logo/leagues/${encodeURIComponent(sportName || "")}/${encodeURIComponent(regionName || "")}/${encodeURIComponent(league || "")}.webp`}
                      className={`w-5 h-5 object-contain`}
                      onError={(e) => {
                        e.currentTarget.src = `${getFlagIconFromregionName(regionName || "")}`;
                        e.currentTarget.className = "rounded-full w-4 h-4";
                      }}
                      alt={league}
                    />
                  </div>

                  {getTranslatedText(league)}
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

        <MarketNavigation
          options={
            selectedCategory === "Matches"
              ? (selectedMarkets[selectedLeague] ?? [])
              : (outrightMarketsByLeague[selectedLeague] ?? [])
          }
          selectedValue={selectedMarketSlug}
          onSelect={setSelectedMarketSlug}
        />
      </div>

      <div className="flex flex-col w-full rounded-[8px] overflow-hidden">
        {loading ? (
          <div className="flex flex-col w-full gap-[2px] mt-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <UpcomingMatchSkeleton key={`match-${index}`} />
            ))}
          </div>
        ) : selectedCategory === "Matches" ? (
          eventIdsForSelectedLeague.map((eventId: number) => (
            <Match
              key={eventId}
              eventId={eventId}
              marketSlug={selectedMarketSlug}
            />
          ))
        ) : (
          outrightEventIdsForSelectedLeague.map((eventId: number) => (
            <Match
              key={eventId}
              eventId={eventId}
              marketSlug={selectedMarketSlug}
            />
          ))
        )}
      </div>
    </div>
  );
};
