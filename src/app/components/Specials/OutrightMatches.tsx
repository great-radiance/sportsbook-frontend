import { FunctionComponent } from "preact";
import { outRightSummarySports } from "@/state/summarySports";
import { useEffect, useMemo, useState } from "preact/hooks";
import { storeEvent } from "@/helpers/storeEvent";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { SportsList } from "../SportsList";
import { UpcomingMatchesLoader } from "../Loading";
import { orderConfigState } from "@/state/orderConfigState";
import { apiGetMatches } from "@/api/matches/apiGetMatches";
import { useTranslate } from "@/shared/i18n/i18n";
import { Match } from "../MatchesBoard/components/Match";

/** `apiGetMatches` sends all ids in one URL; chunk to avoid very long query strings. */
const MAX_EVENT_IDS_PER_REQUEST = 80;

async function fetchMatchesInChunks(eventIds: number[]): Promise<void> {
  const unique = [...new Set(eventIds)].filter(
    (id) => Number.isFinite(id) && id > 0,
  );
  for (let i = 0; i < unique.length; i += MAX_EVENT_IDS_PER_REQUEST) {
    const slice = unique.slice(i, i + MAX_EVENT_IDS_PER_REQUEST);
    const events = await apiGetMatches(slice);
    (events ?? []).forEach((event) => storeEvent(event));
  }
}

export const OutrightMatches: FunctionComponent = () => {
  // Default to Soccer (sportId 1); the SportsList will let the user pick
  // another sport from the outright sidebar data.
  const [selectedSport, setSelectedSport] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const { t } = useTranslate("sidebar");
  const { t: tLiveCal } = useTranslate("liveCalendar");

  const popularEventIds = useMemo(
    () => outRightSummarySports.value.featuredMatches?.[1] ?? [],
    [outRightSummarySports.value],
  );

  const sportsWithCount = useMemo<
    { count: number; name: string; id: number }[]
  >(() => {
    const data = outRightSummarySports.value.data ?? [];
    return data.map((sport) => {
      const sportId = sport[0];
      const sportName = sport[1];
      const count = (sport[2] ?? []).reduce(
        (regionAcc, region) =>
          regionAcc +
          (region[2] ?? []).reduce(
            (leagueAcc, league) => leagueAcc + (league[2] ?? []).length,
            0,
          ),
        0,
      );
      return { count, name: sportName, id: sportId };
    });
  }, [outRightSummarySports.value]);

  const selectedSportTuple = useMemo(
    () =>
      outRightSummarySports.value.data?.find((s) => s[0] === selectedSport) ??
      null,
    [outRightSummarySports.value.data, selectedSport],
  );

  const selectedSportName = selectedSportTuple?.[1] ?? "";
  const regions = useMemo(
    () => selectedSportTuple?.[2] ?? [],
    [selectedSportTuple],
  );

  // First league across the selected sport — opened by default so users
  // immediately see at least one outright bracket without having to click.
  const firstLeagueId = useMemo<number | null>(() => {
    for (const region of regions) {
      for (const league of region[2] ?? []) {
        return league[0];
      }
    }
    return null;
  }, [regions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const eventIds: number[] = [];
        for (const region of regions) {
          for (const league of region[2] ?? []) {
            for (const id of league[2] ?? []) {
              if (typeof id === "number") eventIds.push(id);
            }
          }
        }
        const merged = [
          ...popularEventIds,
          ...eventIds.filter((id) => !popularEventIds.includes(id)),
        ];
        if (merged.length === 0) {
          if (!cancelled) setLoading(false);
          return;
        }

        await fetchMatchesInChunks(merged);
        if (cancelled) return;
      } catch (error) {
        console.error("Error fetching outright matches:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [outRightSummarySports.value, selectedSport, popularEventIds, regions]);

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
            sportsData={sportsWithCount}
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
          {popularEventIds.length > 0 && (
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
          )}
          {regions.map((region) => {
            const regionId = region[0];
            const regionName = region[1];
            const leagues = region[2] ?? [];
            return (
              <div
                key={regionId}
                className="flex flex-col w-full"
                style={{
                  order:
                    orderConfigState.value[selectedSportName]?.regions?.[
                      regionName
                    ]?.order ?? 999,
                }}
              >
                {leagues.map((league) => {
                  const leagueId = league[0];
                  const leagueName = league[1];
                  const eventIds = league[2] ?? [];
                  return (
                    <details
                      key={leagueId}
                      open={leagueId === firstLeagueId}
                      className="flex flex-col w-full gap-2 group/l"
                      style={{
                        order:
                          orderConfigState.value[selectedSportName]?.regions?.[
                            regionName
                          ]?.leagues?.[leagueName]?.order ?? 999,
                      }}
                    >
                      <summary className="flex w-full justify-between items-center gap-2 py-2 px-3 rounded-lg bg-[var(--sub-element-color)] cursor-pointer">
                        <span className="text-[16px] font-bold">
                          {regionName} - {leagueName}
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
