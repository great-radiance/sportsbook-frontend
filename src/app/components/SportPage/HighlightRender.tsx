import { useEffect, useMemo } from "preact/hooks";
import { Match } from "../MatchesBoard/components/Match";
import { MoneylineMatch } from "../MatchesBoard/components/Match/MoneylineMatch";
import { UpcomingMatchSkeleton } from "../Loading";
import { MarketNavigation } from "../marketNavigation";
import { HorizontalTabs } from "../HorizontalTabs";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { useSidebarMarketNavigation } from "@/hooks/useSidebarMarketNavigation";
import {
  eventHasMarketType,
  eventsFromStoreByIds,
  isMoneylineSport,
} from "@/helpers/sidebarMarketNavigation";
import { BetBuilderHighlights } from "@/app/components/SportPage/BetBuilderHighlights";
import { MarketInfoType, sidebarNode } from "@/api/sidebar/apiGetSidebar";
import { isRacingSport } from "@/helpers/isRacingSport";
import { BASE_ASSET_PUBLIC_URL, getAppConfig } from "@/shared/config/appConfig";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { getLeagueId } from "@/helpers/findSidebarNodeByRoute";
import {
  cssOrderFromReferList,
  ensureLeagueOrder,
  leagueNodeNumericId,
} from "@/helpers/referOrder";

type Props = {
  leagueEntries: sidebarNode[];
  selectedLeagueKey: string;
  setSelectedLeagueKey: (key: string) => void;
  sportId: number;
  sportName?: string;
  loading: boolean;
  matches: {
    pre: number[];
    outright: number[];
    live: number[];
  };
  markets: MarketInfoType[];
};

const HighlightRender = ({
  leagueEntries,
  selectedLeagueKey,
  setSelectedLeagueKey,
  sportId,
  sportName,
  loading,
  matches,
  markets,
}: Props) => {
  const { storeState, leagueOrderBySportState } = useSportsbookStore();

  useEffect(() => {
    if (sportId) void ensureLeagueOrder(sportId);
  }, [sportId]);

  const loadedEventsForMarkets = useMemo(
    () =>
      eventsFromStoreByIds(matches.pre, (id) => storeState.value[id]?.value),
    [matches.pre, storeState.value],
  );

  const {
    marketOptions,
    showMarketNav,
    selectedMarketType,
    setSelectedMarketType,
    matchMarketType,
    allowAutoSelect,
  } = useSidebarMarketNavigation({
    markets,
    loadedEvents: loadedEventsForMarkets,
    suppressMarketNav:
      isMoneylineSport(sportId, sportName) || isRacingSport(sportId, sportName),
  });

  const renderMatch = (eventId: number) => {
    const stored = storeState.value[eventId]?.value;
    if (
      showMarketNav &&
      stored &&
      !isMoneylineSport(stored.sport?.id ?? sportId, stored.sport?.name) &&
      !eventHasMarketType(stored, selectedMarketType)
    ) {
      return null;
    }
    if (
      stored &&
      isMoneylineSport(stored.sport?.id ?? sportId, stored.sport?.name)
    ) {
      return <MoneylineMatch key={eventId} eventId={eventId} />;
    }
    return (
      <Match
        key={eventId}
        eventId={eventId}
        marketType={matchMarketType}
        allowAutoSelect={allowAutoSelect}
        allowRounded
      />
    );
  };

  return (
    <>
      {/* <BetBuilderHighlights sportId={sportId} /> */}

      <div className="flex sticky top-0 mb-4 z-[200] bg-[var(--background-element)] flex-col w-full p-2 gap-2 rounded-b-[16px]">
        <nav role="tablist" aria-label="Leagues" className="w-full">
          <HorizontalTabs scrollerClassName="py-1">
            {leagueEntries.map((league) => {
              const isSelected = selectedLeagueKey === league.id;
              const leagueName = league.name ?? "";
              const leagueId = getLeagueId(league);

              return (
                <button
                  key={league.id}
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  title={leagueName}
                  className={[
                    "flex shrink-0 px-4 py-2 gap-2 items-center rounded-lg text-[12px] transition-colors",
                    "whitespace-nowrap",
                    isSelected
                      ? "bg-[var(--highlight-background)] font-bold border-[2px] border-[var(--border-color)]"
                      : "bg-[var(--sub-element-secondary)] hover:bg-[var(--highlight-background)]",
                  ].join(" ")}
                  onClick={() => setSelectedLeagueKey(league.id)}
                  style={{
                    order: cssOrderFromReferList(
                      leagueOrderBySportState.value[sportId],
                      leagueNodeNumericId(league),
                    ),
                  }}
                >
                  <div className="flex items-center justify-center w-6 h-6 bg-white/90 rounded-[4px]">
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/logo/leagueById/${sportId}/${leagueId}.webp`}
                      onError={(e) => {
                        e.currentTarget.src = `${getFlagIconFromregionName(
                          league.region?.name ?? "",
                        )}`;
                        e.currentTarget.className = "rounded-full w-4 h-4";
                      }}
                      className="w-5 h-5 object-contain"
                    />
                  </div>

                  {leagueName}
                </button>
              );
            })}
          </HorizontalTabs>
        </nav>

        {showMarketNav ? (
          <MarketNavigation
            options={marketOptions}
            selectedValue={selectedMarketType}
            onSelect={setSelectedMarketType}
          />
        ) : null}
      </div>

      <section className="flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col w-full gap-[2px] mt-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <UpcomingMatchSkeleton key={`match-${index}`} />
            ))}
          </div>
        ) : (
          matches.pre.map(renderMatch)
        )}
      </section>
    </>
  );
};

export default HighlightRender;
