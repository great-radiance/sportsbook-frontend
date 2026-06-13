import { Fragment, FunctionComponent } from "preact";
import { useEffect, useState, useCallback, useMemo } from "preact/hooks";
import { useLocation } from "wouter-preact";
import { Select, SelectItem } from "@/app/components/Select/index";
import { useTranslate } from "@/shared/i18n/i18n";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { useRouteParams } from "@/hooks/useRotueParams";
import { Match } from "./components/Match";
import { UpcomingMatchSkeleton } from "../Loading";
import { MarketNavigation } from "../marketNavigation";
import { HorizontalTabs } from "../HorizontalTabs";
import { BASE_ASSET_PUBLIC_URL, getAppConfig } from "@/shared/config/appConfig";
import { MatchesGroup } from "./components/MatchesGroup";
import { Breadcrumbs } from "../Breadcrumbs";
import { storeEvent } from "@/helpers/storeEvent";
import { isRacingSport } from "@/helpers/isRacingSport";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { apiGetMatchesByNode } from "@/api/matches/apiGetMatchesByNode";
import {
  buildLeagueSelectValue,
  collectLeagueSelectEntries,
  findLeagueNodeByRoute,
  findSportNode,
} from "@/helpers/findSidebarNodeByRoute";
import { isMoneylineSport } from "@/helpers/sidebarMarketNavigation";

const leagueSelectItemClass = (value: string, currentValue: string) =>
  [
    "!bg-transparent hover:!bg-white/10",
    "flex w-full items-center px-3 py-2 pl-11",
    "text-[14px] font-semibold text-[var(--text-notheme-color)]",
    "rounded-[10px] transition-colors",
    "[&>img]:hidden",
    value === currentValue ? "!bg-white/15" : "",
  ].join(" ");

const regionSelectItemClass = (
  value: string,
  currentValue: string,
  isFirst: boolean,
) =>
  [
    "!bg-transparent hover:!bg-white/10",
    "flex w-full items-center gap-2.5 px-3 py-1.5",
    "text-[14px] font-normal text-[var(--text-notheme-color)]/80",
    "rounded-[10px] transition-colors",
    "[&>img]:!w-5 [&>img]:!h-5 [&>img]:rounded-full [&>img]:object-cover",
    isFirst ? "" : "mt-2.5",
    value === currentValue
      ? "!bg-white/15 text-[var(--text-notheme-color)]"
      : "",
  ].join(" ");

const standaloneSelectItemClass = (
  value: string,
  currentValue: string,
  withTopGap: boolean,
) =>
  [
    "!bg-transparent hover:!bg-white/10",
    "flex w-full items-center gap-2.5 px-3 py-2",
    "text-[14px] font-semibold text-[var(--text-notheme-color)]",
    "rounded-[10px] transition-colors",
    "[&>img]:!w-5 [&>img]:!h-5 [&>img]:rounded-full [&>img]:object-cover",
    withTopGap ? "mt-2.5" : "",
    value === currentValue ? "!bg-white/15" : "",
  ].join(" ");

const switchCategory = (
  category: string,
  eventIds: number[],
  outrightEventIds: number[],
  marketType: number | undefined,
  allowAutoSelect: boolean,
  sportIdParam: string,
  sportName: string,
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
      return (
        <MatchesGroup
          events={eventIds}
          isMoneyline={isMoneylineSport(
            parseInt(sportIdParam ?? "0"),
            sportName ?? "",
          )}
          marketType={marketType}
          allowAutoSelect={allowAutoSelect}
        />
      );
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
  const { loadedSidebarState, summarySportsState } = useSportsbookStore();
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
  const [loading, setLoading] = useState(true);
  const [selectedMarketType, setSelectedMarketType] = useState(1);
  const sportId = Number(sportIdParam) || 0;
  const lang = getAppConfig().lang;
  const sportNode = useMemo(
    () => findSportNode(summarySportsState.value, sportIdParam ?? ""),
    [sportIdParam, summarySportsState.value],
  );

  const leagueSelectEntries = useMemo(
    () =>
      collectLeagueSelectEntries(sportNode, lang, getFlagIconFromregionName),
    [sportNode, lang, summarySportsState.value],
  );

  const selectValue = useMemo(
    () =>
      buildLeagueSelectValue(
        regionName || "",
        regionIdParam || "",
        leagueName || "",
        leagueIdParam || "",
      ),
    [regionName, regionIdParam, leagueName, leagueIdParam],
  );

  const selectedLeagueIcon = useMemo((): string => {
    for (const entry of leagueSelectEntries) {
      if (entry.kind === "standalone" && entry.value === selectValue) {
        return entry.icon ?? getFlagIconFromregionName("International");
      }
      if (entry.kind === "region") {
        const league = entry.leagues.find((item) => item.value === selectValue);
        if (league)
          return league.icon ?? getFlagIconFromregionName(entry.regionLabel);
        if (entry.regionValue === selectValue) {
          return entry.icon ?? getFlagIconFromregionName(entry.regionLabel);
        }
      }
    }
    return getFlagIconFromregionName(regionName || "");
  }, [leagueSelectEntries, selectValue, regionName]);

  const node = useMemo(() => {
    if (!sportIdParam) return undefined;

    const hasNestedLeagueRoute = Boolean(regionIdParam && leagueIdParam);
    const hasStandaloneLeagueRoute = Boolean(
      regionName && regionIdParam && !leagueIdParam,
    );

    if (!hasNestedLeagueRoute && !hasStandaloneLeagueRoute) return undefined;

    return findLeagueNodeByRoute(
      summarySportsState.value,
      sportIdParam,
      regionName,
      regionIdParam ?? "",
      leagueName,
      leagueIdParam ?? "",
      lang,
    );
  }, [
    sportIdParam,
    regionName,
    regionIdParam,
    leagueName,
    leagueIdParam,
    lang,
    summarySportsState.value,
  ]);
  const categories = useMemo(() => {
    if (node?.pre?.length !== 0 && node?.outright?.length !== 0)
      return ["Matches", "Outright"];
    if (node?.pre?.length !== 0) return ["Matches"];
    if (node?.outright?.length !== 0) return ["Outright"];
    return [];
  }, [node]);

  const getMatchesBoard = useCallback(async () => {
    const hasNestedLeagueRoute = Boolean(
      sportIdParam && regionIdParam && leagueIdParam,
    );
    const hasStandaloneLeagueRoute = Boolean(
      sportIdParam && regionName && regionIdParam && !leagueIdParam,
    );

    if (
      (!hasNestedLeagueRoute && !hasStandaloneLeagueRoute) ||
      (!node?.pre?.length && !node?.outright?.length)
    )
      return;
    try {
      const res = await apiGetMatchesByNode(node?.id || "");
      const newEvents = res?.pre?.sort(
        (a, b) =>
          new Date(a.eventInfo.startTime).getTime() -
          new Date(b.eventInfo.startTime).getTime(),
      );
      const newOutrightEvents = res?.outright?.sort(
        (a, b) =>
          new Date(a.eventInfo.startTime).getTime() -
          new Date(b.eventInfo.startTime).getTime(),
      );
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
  }, [sportIdParam, regionName, regionIdParam, leagueIdParam, node]);

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
      node &&
      (node?.outright?.length || node?.pre?.length) &&
      ((regionIdParam && leagueIdParam) ||
        (regionName && regionIdParam && !leagueIdParam))
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
  }, [loadedSidebarState.value, node]);

  return (
    <div
      className={`relative flex flex-col w-full h-full shadow-[-4px_4px_4px_rgba(0,0,0,0.1)] text-[var(--text-notheme-color)] mb-2 rounded-lg`}
    >
      <Breadcrumbs
        items={[
          { label: "Home", href: "/event-view" },
          {
            label: sportName || "",
          },
          {
            label: regionName || "",
          },
          {
            label: leagueName || "",
          },
        ]}
      />
      <div
        className="flex flex-col w-full p-2 rounded-b-[16px] sticky top-0 z-[40] gap-2"
        style={{
          background: `linear-gradient(to right, transparent, #00109E 0%, #0041C2 100%)`,
        }}
      >
        <div className="flex items-center gap-0">
          <div className="flex items-center justify-center bg-white/90 rounded-[6px] h-8 w-8 py-2">
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/logo/leagues/${encodeURIComponent(sportName || "")}/${encodeURIComponent(regionName || "")}/${encodeURIComponent(leagueName || "")}.webp`}
              alt="arrow-left"
              className="w-6 h-6 object-contain"
              onError={(e) => {
                e.currentTarget.src = `${getFlagIconFromregionName(regionName || "")}`;
                e.currentTarget.className = "w-6 h-6 rounded-full";
              }}
            />
          </div>
          <Select
            value={selectValue}
            onSelect={(val: string) => {
              if (!val) return;
              setLocation(
                `/event-view/pre-match/${sportName}/${sportIdParam}/${val}`,
              );
            }}
            className="min-w-0 w-full max-w-[360px]"
            classNames={{
              trigger:
                "w-full min-w-[280px] gap-3 px-0 py-0 !bg-transparent border-0 shadow-none text-[20px] font-bold text-[var(--text-notheme-color)] [&_img]:!w-7 [&_img]:!h-7 [&_img]:rounded-full [&_img]:object-cover",
              panel:
                "bg-[var(--sub-element-color)] py-2 px-1 rounded-[12px] min-w-[300px] max-w-[360px] border-0 max-h-[60vh] overflow-auto shadow-xl",
              item: "!bg-transparent shadow-none",
            }}
            notInvert
          >
            {leagueSelectEntries.length === 0 ? (
              <SelectItem value="">{t("noResults")}</SelectItem>
            ) : (
              leagueSelectEntries.map((entry, index) => {
                if (entry.kind === "standalone") {
                  return (
                    <SelectItem
                      key={entry.key}
                      value={entry.value}
                      icon={entry.icon}
                      className={standaloneSelectItemClass(
                        entry.value,
                        selectValue,
                        index > 0,
                      )}
                    >
                      {entry.label}
                    </SelectItem>
                  );
                }

                return (
                  <Fragment key={entry.key}>
                    <SelectItem
                      value={entry.regionValue}
                      icon={entry.icon}
                      className={regionSelectItemClass(
                        entry.regionValue,
                        selectValue,
                        index === 0,
                      )}
                    >
                      {entry.regionLabel}
                    </SelectItem>
                    {entry.leagues.map((league) => (
                      <SelectItem
                        key={league.key}
                        value={league.value}
                        // icon={league.icon}
                        className={leagueSelectItemClass(
                          league.value,
                          selectValue,
                        )}
                      >
                        {league.label}
                      </SelectItem>
                    ))}
                  </Fragment>
                );
              })
            )}
          </Select>
        </div>
        <HorizontalTabs>
          {categories.map((category: string) => (
            <button
              key={category}
              className={`px-4 py-[6px] text-[12px] font-bold ${selectedCategory === category ? "bg-white rounded-full text-black" : ""}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </HorizontalTabs>
        {node?.children?.length && node?.children?.length > 0 ? (
          <MarketNavigation
            options={node?.children?.map((c) => c.name || "") ?? []}
            selectedValue={selectedMarketType.toString()}
            onSelect={(value: string) => setSelectedMarketType(Number(value))}
            className="text-[var(--text-notheme-color)]"
          />
        ) : null}
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
            node?.pre ?? [],
            node?.outright ?? [],
            selectedMarketType,
            false,
            sportIdParam ?? "",
            sportName ?? "",
          )
        )}
      </div>
    </div>
  );
};
