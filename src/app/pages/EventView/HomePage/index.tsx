import { PreMatchPanel } from "@/app/components/Specials/preMatchPanel";
import { FunctionComponent } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { LiveMatchesPanel } from "@/app/components/Specials/LiveMatchesPanel";
import { TopLeagueMenu } from "@/app/components/TopLeagueMenu";
import { isMobile } from "@/state/isMobile";
import { loadedPrematchState } from "@/state/loadedPrematch";
import { UpcomingMatches } from "@/app/components/Specials/UpcomingMatches";
import { HorizontalTabs } from "@/app/components/HorizontalTabs";
import TrendingAccas from "@/app/components/HomePage.tsx/TrendingAccas";
import { StarPlayers } from "@/app/components/StarPlayers";
import { loadHomeWidgetsBatch } from "@/state/homeWidgetsCache";

export const HomePage: FunctionComponent = () => {
  useEffect(() => {
    void loadHomeWidgetsBatch({ starLimit: 20, accaLimit: 3 });
  }, []);

  return (
    <div className="flex md:p-2 w-full flex-col gap-2">
      <HorizontalTabs>
        <TopLeagueMenu />
      </HorizontalTabs>
      <PreMatchPanel />

      <HorizontalTabs>
        <TrendingAccas />
      </HorizontalTabs>
      {/* {loadedPrematchState.value && <LiveMatchesPanel />} */}
      {/* <PopularMatches /> */}
      <StarPlayers />
      <UpcomingMatches />
    </div>
  );
};
