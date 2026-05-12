import { FunctionComponent } from "preact";
import { outRightSummarySports } from "@/state/summarySports";
import { useEffect, useMemo, useState } from "preact/hooks";
import { storeEvent } from "@/helpers/storeEvent";
import { BASE_ASSET_PUBLIC_URL, getAppConfig } from "@/shared/config/appConfig";
import { SportsList } from "../SportsList";
import { storeState } from "@/state/storeState";
import { MarketComponent } from "../MarketsBoard/components/MarketComponent";
import { UpcomingMatchesLoader } from "../Loading";
import { getTranslate, getTranslatedText } from "@/helpers/getTranslate";
import { orderConfigState } from "@/state/orderConfigState";
import { apiGetMatches } from "@/api/matches/apiGetMatches";
import { useTranslate } from "@/shared/i18n/i18n";
import { Match } from "../MatchesBoard/components/Match";
import { apiGetOutrightMatchs } from "@/api/matches/apiGetOutrightMatchs";
const MATCH_BATCH_SIZE = 10;

export const OutrightMatches: FunctionComponent = () => {
  const [selectedSport, setSelectedSport] = useState<string>("Soccer");
  const [loading, setLoading] = useState<boolean>(true);
  const { t } = useTranslate("sidebar");

  const sportsWithCount = useMemo<
    { count: number; name: string; slug: string }[]
  >(() => {
    const result: { count: number; name: string; slug: string }[] = [];
    Object.keys(outRightSummarySports.value).forEach((sport) => {
      result.push({
        count: Object.keys(outRightSummarySports.value[sport]).reduce(
          (regionAcc, region) => {
            return (
              regionAcc +
              Object.keys(outRightSummarySports.value[sport][region]).reduce(
                (leagueAcc, league) => {
                  return (
                    leagueAcc +
                    Object.keys(
                      outRightSummarySports.value[sport][region][league],
                    ).length
                  );
                },
                0,
              )
            );
          },
          0,
        ),
        name: sport,
        slug: sport,
      });
    });
    return result;
  }, [outRightSummarySports.value]);

  useEffect(() => {
    (async () => {
      const lang = getAppConfig().lang;
      if (lang === "en") return;
      const data = outRightSummarySports.value;
      if (!data || !Object.keys(data).length) return;
      const sourceTexts: string[] = [];
      for (const sport of Object.keys(data)) {
        sourceTexts.push(sport);
        for (const region of Object.keys(data[sport] ?? {})) {
          sourceTexts.push(region);
          for (const league of Object.keys(data[sport][region] ?? {})) {
            sourceTexts.push(league);
          }
        }
      }
      await getTranslate([...new Set(sourceTexts)]);
    })();
  }, [outRightSummarySports.value]);

  useEffect(() => {
    (async () => {
      const eventsTemp: Record<number, { region: string; league: string }> = {};
      try {
        setLoading(true);
        const eventIds: number[] = [];
        for (const r of Object.keys(
          outRightSummarySports.value?.[selectedSport] || {},
        )) {
          for (const l of Object.keys(
            outRightSummarySports.value?.[selectedSport]?.[r] || {},
          )) {
            const raw =
              outRightSummarySports.value?.[selectedSport]?.[r]?.[l] ?? [];
            const rows: { 0: number }[] = Array.isArray(raw)
              ? raw
              : (Object.values(raw) as { 0: number }[]);
            for (const m of rows) {
              const id = m[0];
              if (id == null) continue;
              eventsTemp[id] = { region: r, league: l };
              eventIds.push(id);
            }
          }
        }
        if (eventIds.length === 0) {
          setLoading(false);
          return;
        }

        const batches: number[][] = [];
        for (let i = 0; i < eventIds.length; i += MATCH_BATCH_SIZE) {
          batches.push(eventIds.slice(i, i + MATCH_BATCH_SIZE));
        }

        const results = await Promise.all(
          batches.map((batch) => apiGetMatches(batch).then((res) => res.data)),
        );
        convertAndStoreEvent(results.flat() as unknown as responseEvent[]);
      } catch (error) {
        console.error("Error fetching outright matches:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [outRightSummarySports.value, selectedSport]);

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
            selectedSport={
              selectedSport || sportsWithCount[0]?.slug || "Soccer"
            }
            onSelectSport={setSelectedSport}
            loading={loading}
          />
        </div>
      </div>
      {loading ? (
        <UpcomingMatchesLoader matchesCount={4} />
      ) : (
        <div className="flex flex-col w-full">
          {Object.keys(outRightSummarySports.value[selectedSport] || {}).map(
            (region) => {
              // const r = summarySports.value.config
              //   .find(
              //     (s) =>
              //       s.sport ===
              //       slugify(selectedSport, {
              //         lower: true,
              //         strict: true,
              //         trim: true,
              //       }),
              //   )
              //   ?.regions.find(
              //     (r) =>
              //       r.region ===
              //       slugify(region, { lower: true, strict: true, trim: true }),
              //   );
              return (
                <div
                  key={region}
                  className="flex flex-col w-full"
                  style={{
                    order:
                      orderConfigState.value[selectedSport]?.regions?.[region]
                        ?.order ?? 999,
                  }}
                >
                  {Object.keys(
                    outRightSummarySports.value[selectedSport][region] || {},
                  ).map((league) => {
                    // const l = r?.leagues.find(
                    //   (l) =>
                    //     l.league ===
                    //     slugify(league, {
                    //       lower: true,
                    //       strict: true,
                    //       trim: true,
                    //     }),
                    // );
                    return (
                      <details
                        key={league}
                        className="flex flex-col w-full gap-2 group/l"
                        style={{
                          order:
                            orderConfigState.value[selectedSport]?.regions?.[
                              region
                            ]?.leagues?.[league]?.order ?? 999,
                        }}
                      >
                        <summary className="flex w-full justify-between items-center gap-2 py-2 px-3 rounded-lg bg-[var(--sub-element-color)] cursor-pointer">
                          <span className="text-[16px] font-bold">
                            {getTranslatedText(region)} -{" "}
                            {getTranslatedText(league)}
                          </span>
                          <sl-icon
                            name="chevron-down"
                            className="w-4 h-4 opacity-60 chevron-down-icon ml-1 transition-transform duration-200 ease-out group-open/l:rotate-180"
                          />
                        </summary>
                        <div className="flex flex-col w-full gap-1 pb-2">
                          {Object.values(
                            outRightSummarySports.value[selectedSport][region][
                              league
                            ] || {},
                          ).map((match) => {
                            return (
                              <Match
                                key={match[0]}
                                eventId={match[0]}
                                // marketSlug={selectedMarketSlug}
                              />
                            );
                          })}
                        </div>
                      </details>
                    );
                  })}
                </div>
              );
            },
          )}
        </div>
      )}
    </div>
  );
};
