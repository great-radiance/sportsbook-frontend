import { Match } from "../MatchesBoard/components/Match";
import { UpcomingMatchSkeleton } from "../Loading";
import { MarketNavigation } from "../marketNavigation";
import { HorizontalTabs } from "../HorizontalTabs";
import { sortEventIdsByStartDate } from "@/helpers/sortEventIdsByStartDate";
import type { LeagueLabel } from "@/helpers/resolveSummaryLabels";

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

  sportName?: string;

  selectedCategory: "Matches" | string;

  selectedMarkets: Record<string, any[]>;
  selectedOutrightMarkets: Record<string, any[]>;

  selectedMarketSlug: string;
  setSelectedMarketSlug: (slug: string) => void;

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
  sportName,
  selectedCategory,
  selectedMarkets,
  selectedOutrightMarkets,
  selectedMarketSlug,
  setSelectedMarketSlug,
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

        <MarketNavigation
          options={
            selectedCategory === "Matches"
              ? (selectedMarkets[selectedLeagueKey] ?? [])
              : (selectedOutrightMarkets[selectedLeagueKey] ?? [])
          }
          selectedValue={selectedMarketSlug}
          onSelect={setSelectedMarketSlug}
        />
      </div>

      <section className="flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col w-full gap-[2px] mt-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <UpcomingMatchSkeleton key={`match-${index}`} />
            ))}
          </div>
        ) : selectedCategory === "Matches" ? (
          sortedEventIds.map((eventId) => (
            <Match
              key={eventId}
              eventId={eventId}
              marketSlug={selectedMarketSlug}
              allowRounded
            />
          ))
        ) : (
          sortedOutrightIds.map((eventId) => (
            <Match
              key={eventId}
              eventId={eventId}
              marketSlug={selectedMarketSlug}
              allowRounded
            />
          ))
        )}
      </section>
    </>
  );
};

export default HighlightRender;
