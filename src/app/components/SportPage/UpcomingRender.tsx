import React from "react";
import { Match } from "../MatchesBoard/components/Match";
import { UpcomingMatchSkeleton } from "../Loading";
import { MarketNavigation } from "../marketNavigation";
import { HorizontalTabs } from "../HorizontalTabs";

type League = {
  key: string;
  league: string;
  region?: string;
};

type Props = {
  leagueEntries: League[];
  selectedLeagueKey: string;
  setSelectedLeagueKey: (key: string) => void;

  orderConfigState: any;
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
  getTranslatedText: (text: string) => string;
};

const UpcomingRender = ({
  leagueEntries,
  selectedLeagueKey,
  setSelectedLeagueKey,
  orderConfigState,
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
  getTranslatedText,
}: Props) => {
  return (
    <>
      <div className="flex sticky top-0 mb-4 z-[200] bg-[var(--background-element)] flex-col w-full p-2 gap-2 rounded-b-[16px]">
        {/* League tab list */}

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
          (selectedLeagueEntry?.eventIds || []).map((eventId) => (
            <Match
              key={eventId}
              eventId={eventId}
              marketSlug={selectedMarketSlug}
            />
          ))
        ) : (
          (selectedLeagueEntry?.outrightIds || []).map((eventId) => (
            <Match
              key={eventId}
              eventId={eventId}
              marketSlug={selectedMarketSlug}
            />
          ))
        )}
      </section>
    </>
  );
};

export default UpcomingRender;
