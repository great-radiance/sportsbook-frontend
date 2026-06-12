import { FunctionComponent } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { storeEvent } from "@/helpers/storeEvent";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { SportsList } from "../SportsList";
import { UpcomingMatchesLoader } from "../Loading";
// import { orderConfigState } from "@/state/orderConfigState";
import { useTranslate } from "@/shared/i18n/i18n";
import { Match } from "../MatchesBoard/components/Match";
import { countsSummarySportsState } from "@/state/summarySports";
import {
  apiGetOutrights,
  OutrightResponse,
} from "@/api/matches/apiGetOutrights";
import { apiGetMatchData } from "@/api/matches/apiGetMatchData";

type OutrightTree = {
  id: number;
  name: string;
  countries: {
    id: number;
    name: string;
    leagues: {
      id: number;
      name: string;
      eventIds: number[];
    }[];
  }[];
};

/** `apiGetMatches` sends all ids in one URL; chunk to avoid very long query strings. */
const MAX_EVENT_IDS_PER_REQUEST = 80;

export const OutrightMatches: FunctionComponent = () => {
  // Default to Soccer (sportId 1); the SportsList will let the user pick
  // another sport from the outright sidebar data.
  const [selectedSport, setSelectedSport] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const { t } = useTranslate("sidebar");
  const [outrightResponse, setOutrightResponse] = useState<OutrightTree>();

  const sportsListData = useMemo<{ name: string; id: number }[]>(() => {
    const data = countsSummarySportsState.value.outrightCount.counts;
    return Object.entries(data).map(([id, obj]: [string, any]) => {
      const sportName = obj.name;
      return { id: Number(id), name: sportName };
    });
  }, [countsSummarySportsState.value]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await apiGetOutrights(selectedSport);
        setOutrightResponse(() => {
          const sport = response.sports?.[0];
          if (!sport) return undefined;
          return {
            id: sport.id,
            name: sport.name,
            countries: sport.countries.map((country) => ({
              id: country.id,
              name: country.name,
              leagues: country.leagues.map((league) => ({
                id: league.id,
                name: league.name,
                eventIds:
                  league.events?.map((event) => {
                    storeEvent(event);
                    return event.eventInfo.id;
                  }) ?? [],
              })),
            })),
          };
        });
      } catch (error) {
        console.error("Error fetching outright matches:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSport]);

  return (
    <div
      className={`flex flex-col w-full md:p-2 min-h-0 text-[var(--text-basic-color)] rounded-[4px]`}
    >
      <div className="flex flex-col w-full gap-[10px]">
        <div className="flex flex-1 items-center gap-2">
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/live.png`}
            className="w-[24px] h-[24px] object-contain"
          />
          <span className="text-[20px] font-bold">{t("Outright_Winners")}</span>
        </div>

        <div className="flex w-full pb-[10px]">
          <SportsList
            sportsData={sportsListData}
            selectedSport={selectedSport}
            onSelectSport={setSelectedSport}
            loading={loading}
          />
        </div>
      </div>
      {loading ? (
        <UpcomingMatchesLoader matchesCount={4} />
      ) : (
        <div className="flex flex-col w-full">
          {/* {popularEventIds.length > 0 && (
            <div className="flex flex-col w-full gap-2 pb-4 border-b border-[var(--primary-border-color)] mb-2">
              <div className="flex flex-1 items-center gap-2 px-1">
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/top.png`}
                  className="w-[24px] h-[24px] object-contain invert"
                  alt=""
                />
                <span className="text-[16px] font-bold">
                  {tLiveCal("TopMatches")}
                </span>
              </div>
              <div className="flex flex-col w-full gap-1">
                {popularEventIds.map((eId) => (
                  <Match key={`popular-${eId}`} eventId={eId} />
                ))}
              </div>
            </div>
          )} */}
          {outrightResponse?.countries.map((region) => {
            return (
              <div
                key={region.id}
                className="flex flex-col w-full"
                // style={{
                //   order:
                //     orderConfigState.value[selectedSportName]?.regions?.[
                //       regionName
                //     ]?.order ?? 999,
                // }}
              >
                {region.leagues.map((league) => {
                  const leagueId = league.id;
                  const eventIds = league.eventIds;
                  return (
                    <details
                      key={league.id}
                      open={league.id === region.leagues[0].id}
                      className="flex flex-col w-full gap-2 group/l"
                    >
                      <summary className="flex w-full justify-between items-center gap-2 py-2 px-3 rounded-lg bg-[var(--sub-element-color)] cursor-pointer">
                        <span className="text-[16px] font-bold">
                          {region.name} - {league.name}
                        </span>
                        <sl-icon
                          name="chevron-down"
                          className="w-4 h-4 opacity-60 chevron-down-icon ml-1 transition-transform duration-200 ease-out group-open/l:rotate-180"
                        />
                      </summary>
                      <div className="flex flex-col w-full gap-1 pb-2">
                        {eventIds.map((eId) => (
                          <Match key={eId} eventId={eId} />
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
