import { useMemo } from "preact/hooks";
import { useRoute } from "wouter-preact";

// special
// /event-view/:pageName(special)/:sportsSlug(competition)/:regionSlug(special)/:leagueSlug(special)/:matchId(special)

export const useRouteParams = () => {
  const [, params] = useRoute(
    "/event-view/:pageName?/:sportName?/:regionName?/:leagueName?/:eventId?/:sportName2?",
  );

  const activeTab = useMemo(() => {
    return params?.pageName === "live" ? "live" : "pre-match";
  }, [params?.pageName]);

  return {
    ...(params || {
      pageName: "",
      sportName: "",
      regionName: "",
      leagueName: "",
      eventId: "",
      sportName2: "",
    }),
    activeTab,
  };
};
