import { useMemo } from "preact/hooks";
import { Match } from "../MatchesBoard/components/Match";
import { MoneylineMatch } from "../MatchesBoard/components/Match/MoneylineMatch";
import { UpcomingMatchSkeleton } from "../Loading";
import { MarketNavigation } from "../marketNavigation";
import { HorizontalTabs } from "../HorizontalTabs";
import { sortEventIdsByStartDate } from "@/helpers/sortEventIdsByStartDate";
import type { LeagueLabel } from "@/helpers/resolveSummaryLabels";
import { storeState } from "@/state/storeState";
import { useSidebarMarketNavigation } from "@/hooks/useSidebarMarketNavigation";
import {
  eventHasMarketType,
  isMoneylineSport,
} from "@/helpers/sidebarMarketNavigation";
import { BetBuilderHighlights } from "@/app/components/SportPage/BetBuilderHighlights";
import { sidebarNode } from "@/api/sidebar/apiGetSidebar";
import { BASE_ASSET_PUBLIC_URL, getAppConfig } from "@/shared/config/appConfig";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";

type League = {
  key: string;
  regionId: number;
  leagueId: number;
};

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
};

const HighlightRender = ({
  leagueEntries,
  selectedLeagueKey,
  setSelectedLeagueKey,
  sportId,
  sportName,
  loading,
  matches,
}: Props) => {
  const {
    marketOptions,
    showMarketNav,
    selectedMarketType,
    setSelectedMarketType,
    matchMarketType,
    allowAutoSelect,
  } = useSidebarMarketNavigation({
    sportId,
    sportName,
    loadedEvents: [],
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
      <BetBuilderHighlights sportId={sportId} />

      <div className="flex sticky top-0 mb-4 z-[200] bg-[var(--background-element)] flex-col w-full p-2 gap-2 rounded-b-[16px]">
        <nav role="tablist" aria-label="Leagues" className="w-full">
          <HorizontalTabs scrollerClassName="py-1">
            {leagueEntries.map((league) => {
              const isSelected = selectedLeagueKey === league.id;
              const leagueName = league.translations[getAppConfig().lang] ?? "";
              const regionName =
                league.region?.translations[getAppConfig().lang] ?? "";

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
                >
                  <div className="flex items-center justify-center w-6 h-6 bg-white/90 rounded-[4px]">
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/logo/leagueById/${sportId}/${league.id}.webp`}
                      onError={(e) => {
                        e.currentTarget.src = `${getFlagIconFromregionName(
                          league.region?.translations["en"] ?? "",
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
