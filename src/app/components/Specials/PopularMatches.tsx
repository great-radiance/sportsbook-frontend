import { FunctionComponent } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { UpcomingMatchSkeleton } from "@/app/components/Loading";
import { useTranslate } from "@/shared/i18n/i18n";
import { SportsList } from "../SportsList";
import { apiGetMatches } from "@/api/matches/apiGetMatches";
import { popularMatchesState } from "@/state/popularMatchesState";
import { MarketNavigation } from "../marketNavigation";
import { storeEvent } from "@/helpers/storeEvent";
import { Match } from "../MatchesBoard/components/Match";
import { summarySports } from "@/state/summarySports";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { MatchDataResponse } from "@/api/matches/apiGetMatchData";
import { storeState } from "@/state/storeState";
import { isEventValidForDisplay } from "@/helpers/sortEventIdsByStartDate";

const BATCH_SIZE = 25;
const FALLBACK_MARKETS = ["Match Result", "Total", "Handicap"];

type SportNode = Record<string, Record<string, number[]>>;

function buildPopularTree(
  events: MatchDataResponse[],
): Record<string, SportNode> {
  const tree: Record<string, SportNode> = {};
  for (const ev of events) {
    const id = ev.eventInfo?.id;
    if (!id) continue;
    const sportKey = String(ev.eventInfo.sport?.id ?? 0);
    const region = ev.eventInfo.country?.name ?? "";
    const league = ev.eventInfo.competition?.name ?? "";
    if (!tree[sportKey]) tree[sportKey] = {};
    if (!tree[sportKey][region]) tree[sportKey][region] = {};
    if (!tree[sportKey][region][league]) tree[sportKey][region][league] = [];
    if (!tree[sportKey][region][league].includes(id)) {
      tree[sportKey][region][league].push(id);
    }
  }
  return tree;
}

function collectMarketOptions(events: MatchDataResponse[]): string[] {
  const names = new Set<string>();
  for (const e of events) {
    for (const m of e.markets ?? []) {
      if (m.name) names.add(m.name);
    }
  }
  if (names.size === 0) return FALLBACK_MARKETS;
  const preferred = ["Match Result", "Winner", "1X2", "Moneyline"];
  return [...names].sort((a, b) => {
    const ai = preferred.indexOf(a);
    const bi = preferred.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
}

function getEventIdsForSport(
  popularMatches: Record<string, SportNode>,
  sportId: number,
): number[] {
  const state = popularMatches[String(sportId)];
  if (!state) return [];

  const ids: number[] = [];
  for (const region of Object.keys(state)) {
    for (const league of Object.keys(state[region] ?? {})) {
      ids.push(...(state[region][league] ?? []));
    }
  }
  return ids;
}

export const PopularMatches: FunctionComponent = () => {
  const { t } = useTranslate("liveCalendar");

  const [selectedMarket, setSelectedMarket] = useState<string>("Match Result");
  const [selectedSport, setSelectedSport] = useState<number>(0);
  const [selectedMarkets, setSelectedMarkets] =
    useState<string[]>(FALLBACK_MARKETS);
  const [loading, setLoading] = useState<boolean>(true);

  const popularMatches = popularMatchesState.value as Record<string, SportNode>;

  const featuredEventIds = useMemo(
    () => summarySports.value.featuredMatches?.[1] ?? [],
    [summarySports.value.featuredMatches],
  );

  const sportsData = useMemo(() => {
    return Object.keys(popularMatches).map((sportKey) => {
      const sportId = Number(sportKey);
      let count = 0;
      const state = popularMatches[sportKey] ?? {};
      for (const region of Object.keys(state)) {
        for (const league of Object.keys(state[region] ?? {})) {
          count += (state[region][league] ?? []).length;
        }
      }

      const sampleId = getEventIdsForSport(
        popularMatches as Record<string, SportNode>,
        sportId,
      )[0];
      const sportName =
        storeState.value[sampleId]?.value?.sport?.name ?? `Sport ${sportKey}`;

      return { count, name: sportName, id: sportId };
    });
  }, [popularMatches, storeState.value]);

  const displayedEventIds = useMemo(() => {
    return getEventIdsForSport(popularMatches, selectedSport).filter((id) => {
      const ev = storeState.value[id]?.value;
      return !!ev && isEventValidForDisplay(ev);
    });
  }, [popularMatches, selectedSport, storeState.value]);

  useEffect(() => {
    if (!loadedSidebarState.value || featuredEventIds.length === 0) {
      if (loadedSidebarState.value && featuredEventIds.length === 0) {
        setLoading(false);
      }
      return;
    }

    let cancelled = false;

    const loadFeaturedMatches = async () => {
      setLoading(true);
      try {
        const allEvents: MatchDataResponse[] = [];
        for (let i = 0; i < featuredEventIds.length; i += BATCH_SIZE) {
          const batchIds = featuredEventIds.slice(i, i + BATCH_SIZE);
          const batch = await apiGetMatches(batchIds);
          allEvents.push(...(batch ?? []));
        }

        if (cancelled) return;

        for (const event of allEvents) {
          storeEvent(event);
        }

        popularMatchesState.value = buildPopularTree(allEvents);
        setSelectedMarkets(collectMarketOptions(allEvents));
        if (allEvents.length > 0) {
          const firstSportId = allEvents[0]?.eventInfo?.sport?.id;
          if (firstSportId) setSelectedSport(firstSportId);
        }
      } catch (error) {
        console.error("Error fetching featured matches:", error);
        if (!cancelled) {
          popularMatchesState.value = {};
          setSelectedMarkets(FALLBACK_MARKETS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadFeaturedMatches();

    return () => {
      cancelled = true;
    };
  }, [featuredEventIds, loadedSidebarState.value]);

  useEffect(() => {
    const sportKeys = Object.keys(popularMatches).map(Number);
    if (sportKeys.length === 0) return;
    if (!selectedSport || !popularMatches[String(selectedSport)]) {
      setSelectedSport(sportKeys[0]);
    }
  }, [popularMatches, selectedSport]);

  if (featuredEventIds.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col md:px-2 rounded-[16px] text-[var(--text-basic-color)] w-full min-h-0 overflow-y-auto">
      <div className="flex flex-1 items-center pt-4 pb-2 md:px-4 gap-2 text-[20px]">
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/top.png`}
          className="w-[24px] h-[24px] object-contain invert"
          alt=""
        />
        <span className="text-[20px] font-bold">{t("TopMatches")}</span>
      </div>

      <div className="flex w-full md:px-2">
        <SportsList
          sportsData={sportsData}
          selectedSport={selectedSport}
          onSelectSport={setSelectedSport}
        />
      </div>

      <MarketNavigation
        options={selectedMarkets}
        selectedValue={selectedMarket}
        onSelect={setSelectedMarket}
      />

      {loading ? (
        <div className="flex flex-col w-full gap-[2px] mt-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <UpcomingMatchSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col w-full h-full rounded-lg overflow-hidden">
          {displayedEventIds.map((eventId) => (
            <div key={eventId} className="flex flex-col w-full rounded-[4px]">
              <div className="w-full h-full transition-all duration-300 ease-in-out">
                <div className="flex flex-col w-full h-full">
                  <Match eventId={eventId} marketSlug={selectedMarket} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
