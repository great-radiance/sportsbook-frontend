import { useMemo } from "preact/hooks";
import { Match } from "../MatchesBoard/components/Match";
import { MoneylineMatch } from "../MatchesBoard/components/Match/MoneylineMatch";
import { UpcomingMatchSkeleton } from "../Loading";
import { MarketNavigation } from "../marketNavigation";
import { HorizontalTabs } from "../HorizontalTabs";
import { sortEventIdsByStartDate } from "@/helpers/sortEventIdsByStartDate";
import type { LeagueLabel } from "@/helpers/resolveSummaryLabels";
import { summarySports } from "@/state/summarySports";
import { storeState } from "@/state/storeState";
import { useSidebarMarketNavigation } from "@/hooks/useSidebarMarketNavigation";
import {
  eventHasMarketType,
  isMoneylineSport,
} from "@/helpers/sidebarMarketNavigation";

type League = {
  key: string;
  regionId: number;
  leagueId: number;
};

type Props = {
  leagueEntries: League[];
  leagueLabelMap: Map<string, LeagueLabel>;
  selectedLeagueKey: string;
  setSelectedLeagueKey: (key: string) => void;
  sportId: number;
  sportName?: string;
  selectedCategory: "Matches" | string;
  selectedLeagueEntry?: {
    eventIds?: number[];
    outrightIds?: number[];
  };
  loading: boolean;
  BASE_ASSET_PUBLIC_URL: string;
  getFlagIconFromregionName: (region: string) => string;
};

const HighlightRender = ({
  leagueEntries,
  leagueLabelMap,
  selectedLeagueKey,
  setSelectedLeagueKey,
  sportId,
  sportName,
  selectedCategory,
  selectedLeagueEntry,
  loading,
  BASE_ASSET_PUBLIC_URL,
  getFlagIconFromregionName,
}: Props) => {
  const sortedEventIds = sortEventIdsByStartDate(
    selectedLeagueEntry?.eventIds || [],
  );
  const sortedOutrightIds = sortEventIdsByStartDate(
    selectedLeagueEntry?.outrightIds || [],
  );
  const activeEventIds =
    selectedCategory === "Matches" ? sortedEventIds : sortedOutrightIds;

  const loadedEventsForMarkets = useMemo(
    () =>
      activeEventIds
        .map((id) => storeState.value[id]?.value)
        .filter(Boolean),
    [activeEventIds, storeState.value],
  );

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
    loadedEvents: loadedEventsForMarkets,
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
      <div className="flex sticky top-0 mb-4 z-[200] bg-[var(--background-element)] flex-col w-full p-2 gap-2 rounded-b-[16px]">
        <nav role="tablist" aria-label="Leagues" className="w-full">
          <HorizontalTabs scrollerClassName="py-1">
            {leagueEntries.map((league) => {
              const isSelected = selectedLeagueKey === league.key;
              const label =
                leagueLabelMap.get(`${league.regionId}:${league.leagueId}`) ??
                null;
              const leagueName = label?.leagueName ?? String(league.leagueId);
              const regionName = label?.regionName ?? "";

              return (
                <button
                  key={league.key}
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
                  onClick={() => setSelectedLeagueKey(league.key)}
                >
                  <div className="flex items-center justify-center w-6 h-6 bg-white/90 rounded-[4px]">
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/logo/leagues/${encodeURIComponent(
                        sportName || "",
                      )}/${encodeURIComponent(regionName)}/${encodeURIComponent(
                        leagueName,
                      )}.webp`}
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = `${getFlagIconFromregionName(
                          regionName,
                        )}`;
                        e.currentTarget.className = "rounded-full w-4 h-4";
                      }}
                      alt={leagueName}
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
          activeEventIds.map(renderMatch)
        )}
      </section>
    </>
  );
};

export default HighlightRender;
