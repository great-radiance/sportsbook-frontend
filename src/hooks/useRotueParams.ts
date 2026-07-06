import { useMemo } from "preact/hooks";
import { useRoute } from "wouter-preact";

// special
// /event-view/:pageName(special)/:sportsSlug(competition)/:regionSlug(special)/:leagueSlug(special)/:matchId(special)

function decodeRouteParam(value: string | undefined): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export const useRouteParams = () => {
  const [, params] = useRoute(
    "/event-view/:pageName?/:sportName?/:sportIdParam?/:regionName?/:regionIdParam?/:leagueName?/:leagueIdParam?/:eventId?/:sportName2?",
  );

  const activeTab = useMemo(() => {
    return params?.pageName === "live" ? "live" : "pre-match";
  }, [params?.pageName]);

  const raw = params || {
    pageName: "",
    sportName: "",
    sportIdParam: "",
    regionName: "",
    regionIdParam: "",
    leagueName: "",
    leagueIdParam: "",
    eventId: "",
    sportName2: "",
  };

  return {
    pageName: decodeRouteParam(raw.pageName),
    sportName: decodeRouteParam(raw.sportName),
    sportIdParam: raw.sportIdParam,
    regionName: decodeRouteParam(raw.regionName),
    regionIdParam: raw.regionIdParam,
    leagueName: decodeRouteParam(raw.leagueName),
    leagueIdParam: raw.leagueIdParam,
    eventId: raw.eventId,
    sportName2: decodeRouteParam(raw.sportName2),
    activeTab,
  };
};
