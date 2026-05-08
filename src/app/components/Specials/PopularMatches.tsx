import { FunctionComponent } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { UpcomingMatchSkeleton } from "@/app/components/Loading";
import { useTranslate } from "@/shared/i18n/i18n";
import { apiGetFeaturedMatches } from "@/api/special-matches/apiGetFeaturedMatches";
import { SportsList } from "../SportsList";
import { apiGetMatches } from "@/api/matches/apiGetMatches";
import { popularMatchesState } from "@/state/popularMatchesState";
import { MarketNavigation } from "../marketNavigation";
import { storeEvent } from "@/helpers/storeEvent";
import { Match } from "../MatchesBoard/components/Match";
import { apiGetMatchesAuto } from "@/api/matches/apiGetMatchesAuto";

type SportNode = Record<string, Record<string, number[]>>;

export const PopularMatches: FunctionComponent = () => {
  const { t } = useTranslate("liveCalendar");

  const [selectedMarket, setSelectedMarket] = useState<string>("Winner");
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Read signal value once per render so the component reacts to updates.
  const popularMatches = popularMatchesState.value as Record<string, SportNode>;

  const sportsData = useMemo(() => {
    return Object.keys(popularMatches).map((sport) => {
      let count = 0;

      for (const region of Object.keys(popularMatches[sport] ?? {})) {
        for (const league of Object.keys(popularMatches[sport][region] ?? {})) {
          count += (popularMatches[sport][region][league] ?? []).length;
        }
      }

      return {
        count,
        name: sport,
        slug: sport,
      };
    });
  }, [popularMatches]);

  const getEventIdsForSport = (sport: string): number[] => {
    const state = popularMatches[sport];
    if (!state) return [];

    const ids: number[] = [];
    for (const region of Object.keys(state)) {
      for (const league of Object.keys(state[region] ?? {})) {
        ids.push(...(state[region][league] ?? []));
      }
    }

    return ids;
  };

  useEffect(() => {
    let cancelled = false;

    const loadFeaturedMatches = async () => {
      if (Object.keys(popularMatchesState.value).length > 0) {
        return;
      }

      try {
        const res = await apiGetFeaturedMatches();
        console.log("popular matches res", res);
        if (cancelled) return;
        popularMatchesState.value = res ?? {};
      } catch (error) {
        console.error("Error fetching featured matches:", error);
      }
    };

    loadFeaturedMatches();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sportKeys = Object.keys(popularMatches);

    if (sportKeys.length === 0) {
      setLoading(true);
      return;
    }

    if (!selectedSport || !popularMatches[selectedSport]) {
      setSelectedSport(sportKeys[0]);
    }
  }, [popularMatches, selectedSport]);

  useEffect(() => {
    let cancelled = false;

    const loadMatchDetails = async () => {
      const state = popularMatches;
      if (Object.keys(state).length === 0) return;

      setLoading(true);

      try {
        const flat: {
          sport: string;
          region: string;
          league: string;
          id: number;
        }[] = [];

        for (const region of Object.keys(state[selectedSport] ?? {})) {
          for (const league of Object.keys(
            state[selectedSport][region] ?? {},
          )) {
            const ids = state[selectedSport][region][league] ?? [];
            for (const id of ids) {
              flat.push({ sport: selectedSport, region, league, id });
            }
          }
        }

        const eventIds = flat.map((item) => item.id);
        if (eventIds.length === 0) {
          if (!cancelled) {
            setSelectedMarkets([]);
            setLoading(false);
          }
          return;
        }

        const BATCH_SIZE = 25;
        const allResponses: Awaited<ReturnType<typeof apiGetMatches>>[] = [];

        for (let i = 0; i < eventIds.length; i += BATCH_SIZE) {
          const batchIds = eventIds.slice(i, i + BATCH_SIZE);
          const response = await apiGetMatchesAuto(batchIds);
          allResponses.push(response);
        }

        if (cancelled) return;

        convertAndStoreEvent(allResponses.flatMap((response) => response.data));

        const dedupedMarkets = Array.from(
          new Set(
            allResponses.flatMap((response) => response.marketsMeta ?? []),
          ),
        );

        setSelectedMarkets(dedupedMarkets);
      } catch (error) {
        console.error("Error fetching popular match details:", error);
        if (!cancelled) {
          setSelectedMarkets([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadMatchDetails();

    return () => {
      cancelled = true;
    };
  }, [popularMatches, selectedSport]);

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
          {getEventIdsForSport(selectedSport).map((eventId) => (
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
