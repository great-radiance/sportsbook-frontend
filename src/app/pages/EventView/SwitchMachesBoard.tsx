import { MatchesBoard } from "@/app/components/MatchesBoard";
import { BoostedOdds } from "@/app/components/Specials/BoostedOdds";
import { OutrightMatches } from "@/app/components/Specials/OutrightMatches";
import { PopularMatches } from "@/app/components/Specials/PopularMatches";
import { UpcomingMatches } from "@/app/components/Specials/UpcomingMatches";
import { useRouteParams } from "@/hooks/useRotueParams";
import { FunctionComponent } from "preact";
import { useCallback } from "preact/hooks";
import { HomePage } from "./HomePage";
import { MarketsBoard } from "@/app/components/MarketsBoard";
import { RegionMatchesBoard } from "@/app/components/MatchesBoard/RegionMatchesBoard";
import { SportPage } from "./SportPage";

export const SwitchMachesBoard: FunctionComponent = () => {
  const {
    pageName,
    sportName,

    sportIdParam,
    regionIdParam,
    leagueIdParam,
    eventId,
  } = useRouteParams();

  const switchMachesBoard = useCallback(() => {
    if (pageName === "special") {
      if (sportName === "upcoming") {
        return <UpcomingMatches />;
        // } else if (sportName === "popular") {
        // return <PopularMatches />;
        // } else if (sportName === "boosted") {
        //   return <BoostedOdds />;
        // } else if (sportName === "outright") {
        //   return <OutrightMatches />;
      } else if (sportName === "competitions") {
        return <MatchesBoard />;
      }
    } else if (eventId) return <MarketsBoard />;
    else if (leagueIdParam) return <MatchesBoard />;
    else if (regionIdParam) {
      return <RegionMatchesBoard />;
    } else if (sportIdParam) {
      return <SportPage />;
    }
    return <HomePage />;
  }, [
    pageName,
    sportName,
    sportIdParam,
    regionIdParam,
    leagueIdParam,
    eventId,
  ]);

  return switchMachesBoard();
};
