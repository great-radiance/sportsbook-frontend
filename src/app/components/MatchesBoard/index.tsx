import { Fragment, FunctionComponent } from "preact";
import { useEffect, useState, useCallback } from "preact/hooks";
import { useLocation } from "wouter-preact";
import { Select, SelectItem } from "@/app/components/Select/index";
import { useTranslate } from "@/shared/i18n/i18n";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { useRouteParams } from "@/hooks/useRotueParams";
import { outRightSummarySports, summarySports } from "@/state/summarySports";
import { Match } from "./components/Match";
import { UpcomingMatchSkeleton } from "../Loading";
import {
  apiGetMatches,
  // responseEvent
} from "@/api/matches/apiGetMatches";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { MarketNavigation } from "../marketNavigation";
import { HorizontalTabs } from "../HorizontalTabs";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { MatchesGroup } from "./components/MatchesGroup";
import { Breadcrumbs } from "../Breadcrumbs";
import { storeEvent } from "@/helpers/storeEvent";

const switchCategory = (
  category: string,
  eventIds: number[],
  outrightEventIds: number[],
  selectedMarketSlug: string,
) => {
  switch (category) {
    case "Hot":
      return (
        <div className="flex flex-col w-full gap-4 py-4">
          <div className="flex gap-2 text-[14px] uppercase">
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/icons/hot.png`}
              alt="hot"
              className="w-4 h-4"
            />
            <span>Matches</span>
          </div>
          {/* matches list */}

          {/* Outright */}
        </div>
      );
    case "Matches":
      return <MatchesGroup events={eventIds} marketSlug={selectedMarketSlug} />;
    case "Outright":
      return (
        <div className="flex flex-col w-full gap-4 py-4">
          {outrightEventIds.map((eventId) => (
            <Match key={eventId} eventId={eventId} />
          ))}
        </div>
      );
    default:
      return <></>;
  }
};

export const MatchesBoard: FunctionComponent = () => {
  const CATEGORIES = ["Matches", "Outright"];
  const [selectedCategory, setSelectedCategory] = useState<string>("Matches");
  const { t } = useTranslate("markets");
  const {
    sportName,
    sportIdParam,
    regionName,
    regionIdParam,
    leagueName,
    leagueIdParam,
  } = useRouteParams();
  const [, setLocation] = useLocation();
  const [selectedMarketSlug, setSelectedMarketSlug] =
    useState<string>("Winner");
  const [selectedMarkets, setSelectedMarkets] = useState<
    Record<string, string[]>
  >({});

  const [loading, setLoading] = useState(true);
  const sportRegions =
    summarySports.value.data?.find((s) => s[0] === Number(sportIdParam))?.[2] ||
    undefined;
  const eventIds: number[] =
    sportRegions
      ?.find((r) => r[0] === Number(regionIdParam))?.[2]
      ?.find((l) => l[0] === Number(leagueIdParam))?.[2] || ([] as number[]);

  const outrightEventIds =
    outRightSummarySports.value?.data
      ?.find((s) => s[0] === Number(sportIdParam))?.[2]
      ?.find((r) => r[0] === Number(regionIdParam))?.[2]
      ?.find((l) => l[0] === Number(leagueIdParam))?.[2] || [];

  console.log("outrightEventIds", outrightEventIds);

  const selectValue =
    regionName || (regionIdParam && leagueName) || leagueIdParam
      ? `${regionName}/${regionIdParam}/${leagueName}/${leagueIdParam}`
      : "";

  const getMatchesBoard = useCallback(async () => {
    if (
      !sportIdParam ||
      !regionIdParam ||
      !leagueIdParam ||
      !eventIds.length ||
      summarySports.value.data
        ?.find((s) => s[0] === Number(sportIdParam))?.[2]
        ?.find((r) => r[0] === Number(regionIdParam))?.[2]
        ?.find((l) => l[0] === Number(leagueIdParam))?.[2]?.length === 0
    )
      return;
    try {
      const eventIds: number[] =
        summarySports.value.data
          .find((s) => s[0] === Number(sportIdParam))?.[2]
          .find((r) => r[0] === Number(regionIdParam))?.[2]
          ?.find((l) => l[0] === Number(leagueIdParam))?.[2] ||
        ([] as number[]);
      console.log("eventIds", eventIds);
      const [res, resOutright] = await Promise.all([
        apiGetMatches(eventIds),
        // apiGetMatchesAuto(eventIds),
        // apiGetOutrightMatchs(outrightEventIds),
        apiGetMatches(outrightEventIds),
      ]);
      const newEvents = res?.sort(
        (a, b) =>
          new Date(a.eventInfo.startTime).getTime() -
          new Date(b.eventInfo.startTime).getTime(),
      );
      const newOutrightEvents = resOutright?.sort(
        (a, b) =>
          new Date(a.eventInfo.startTime).getTime() -
          new Date(b.eventInfo.startTime).getTime(),
      );
      console.log("newEvents", newEvents);
      // const tempMarkets: Record<string, string[]> = {};
      // tempMarkets["Matches"] = res.marketsMeta;
      // tempMarkets["Outright"] = resOutright.marketsMeta;
      for (const event of newEvents) {
        storeEvent(event);
      }
      for (const event of newOutrightEvents) {
        storeEvent(event);
      }
      // convertAndStoreEvent(newOutrightEvents as unknown as responseEvent[]);
      // setSelectedMarkets(tempMarkets);
    } catch (error) {
      console.error("Error fetching matches board:", error);
    }
  }, [sportIdParam, regionIdParam, leagueIdParam, summarySports.value]);

  // useEffect(() => {
  //   (async () => {
  //     try {
  //       await getMatchesBoard();
  //     } catch (error) {
  //       console.error("Error fetching matches board:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   })();
  // }, [getMatchesBoard]);

  useEffect(() => {
    if (!loadedSidebarState.value) return;
    if (
      sportIdParam &&
      regionIdParam &&
      leagueIdParam &&
      summarySports.value.data
        .find((s) => s[0] === Number(sportIdParam))?.[2]
        .find((r) => r[0] === Number(regionIdParam))?.[2]
        ?.find((l) => l[0] === Number(leagueIdParam))?.[2]?.length
    ) {
      setLoading(true);
      (async () => {
        try {
          await getMatchesBoard();
        } catch (error) {
          setLoading(false);
          console.error("Error fetching matches board:", error);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setLoading(false);
      return;
    }
  }, [loadedSidebarState.value, sportIdParam, regionIdParam, leagueIdParam]);

  return (
    <div
      className={`relative flex flex-col w-full h-full shadow-[-4px_4px_4px_rgba(0,0,0,0.1)] text-[var(--text-notheme-color)] mb-2 rounded-lg`}
    >
      <Breadcrumbs
        items={[
          { label: "Home", href: "/event-view" },
          {
            label:
              summarySports.value.data.find(
                (s) => s[0] === Number(sportIdParam),
              )?.[1] || "",
          },
          {
            label:
              summarySports.value.data
                .find((s) => s[0] === Number(sportIdParam))?.[2]
                .find((r) => r[0] === Number(regionIdParam))?.[1] || "",
          },
          {
            label:
              summarySports.value.data
                .find((s) => s[0] === Number(sportIdParam))?.[2]
                .find((r) => r[0] === Number(regionIdParam))?.[2]
                ?.find((l) => l[0] === Number(leagueIdParam))?.[1] || "",
          },
        ]}
      />
      <div
        className="flex flex-col w-full p-2 rounded-b-[16px] sticky top-0 z-[200] gap-2"
        style={{
          background: `linear-gradient(to right, transparent, #00109E 0%, #0041C2 100%)`,
        }}
      >
        <div className="flex items-center gap-0">
          <div className="flex items-center justify-center bg-white/90 rounded-[6px] h-8 w-8 py-2">
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/logo/leagues/${encodeURIComponent(sportName || "")}/${encodeURIComponent(regionName || "")}/${encodeURIComponent(leagueName || "")}.webp`}
              onError={(e) => {
                e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/logo/leagues/default.webp`;
              }}
              alt="arrow-left"
              className="w-6 h-6 object-contain"
            />
          </div>
          <Select
            value={selectValue}
            onSelect={(val: string) => {
              // ignore region header selections
              if (!val || val.startsWith("region__")) return;
              // setSelectedleagueNameLocal(val.split("/")[1]);
              const newPath = `/event-view/pre-match/${sportName}/${sportIdParam}/${val}`;
              setLocation(newPath);
            }}
            className="text-black"
            classNames={{
              trigger:
                "max-w-fit gap-3 text-[20px] text-[var(--text-notheme-color)]",
              panel: `bg-[var(--sub-element-color)] gap-1 rounded-[8px] min-w-fit border border-[var(--primary-border-color)] max-h-[60vh] overflow-auto`,
              item: `flex text-[var(--text-basic-color)] min-w-fit rounded-[4px] transition-colors `,
            }}
            notInvert
          >
            {sportRegions?.length === 0 ? (
              <SelectItem value="">{t("noResults")}</SelectItem>
            ) : (
              sportRegions?.map((region) => (
                <Fragment key={region[0]}>
                  <SelectItem
                    key={`region-${region[0]}`}
                    value={`region__${region[0]}`}
                    disabled
                    className="flex font-bold text-[13px] items-center gap-2"
                  >
                    <img
                      src={getFlagIconFromregionName(region[1] || "")}
                      alt={region[1] || ""}
                      className="w-5 h-5 rounded-full"
                    />
                    {region[1] || ""}
                  </SelectItem>
                  {region[2]?.map((l) => (
                    <SelectItem
                      key={`${region[1]}/${region[0]}/${l[1]}/${l[0]}`}
                      value={`${region[1]}/${region[0]}/${l[1]}/${l[0]}`}
                      className="pl-6 text-[12px] text-[var(--text-basic-color)] hover:bg-black/20 rounded-[4px]"
                    >
                      {l[1] || ""}
                    </SelectItem>
                  ))}
                </Fragment>
              ))
            )}
          </Select>
        </div>
        <HorizontalTabs>
          {CATEGORIES.map((category: string) => (
            <button
              key={category}
              className={`px-4 py-[6px] text-[12px] font-bold ${selectedCategory === category ? "bg-white rounded-full text-black" : ""}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </HorizontalTabs>
        <MarketNavigation
          options={selectedMarkets[selectedCategory] || []}
          selectedValue={selectedMarketSlug}
          onSelect={setSelectedMarketSlug}
          className="text-[var(--text-notheme-color)]"
        />
      </div>

      <div className="flex flex-col w-full h-full rounded-lg overflow-hidden gap-4">
        {loading ? (
          <div className="flex flex-col w-full gap-[2px] mt-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <UpcomingMatchSkeleton key={`match-${index}`} />
            ))}
          </div>
        ) : (
          switchCategory(
            selectedCategory,
            eventIds,
            outrightEventIds,
            selectedMarketSlug,
          )
        )}
      </div>
    </div>
  );
};
