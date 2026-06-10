import { FunctionComponent } from "preact";
import { useEffect } from "preact/hooks";
import { UpcomingMatches } from "@/app/components/Specials/UpcomingMatches";
import TrendingAccas from "@/app/components/HomePage/TrendingAccas";
import { StarPlayers } from "@/app/components/StarPlayers";
import { loadHomeWidgetsBatch } from "@/state/homeWidgetsCache";
import { CardListSection } from "@/app/components/CardListSection";
import { PrimePicks } from "@/app/components/HomePage/PrimePicks";
import { PreMatchPanel } from "@/app/components/Specials/preMatchPanel";
import { TopLeagueMenu } from "@/app/components/TopLeagueMenu";
import { HorizontalTabs } from "@/app/components/HorizontalTabs";

export const HomePage: FunctionComponent = () => {
  useEffect(() => {
    void loadHomeWidgetsBatch();
  }, []);

  return (
    <div className="flex md:p-2 w-full flex-col gap-2">
      <CardListSection />
      <HorizontalTabs>
        <TopLeagueMenu />
      </HorizontalTabs>
      <PreMatchPanel />
      <TrendingAccas />
      <StarPlayers />
      <PrimePicks />
      <UpcomingMatches />
    </div>
  );
};
