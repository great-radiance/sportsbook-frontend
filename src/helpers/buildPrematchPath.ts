/** Matches `useRouteParams` / sidebar: `/event-view/pre-match/{sport}/{sportId}/...` */
export function buildPrematchPath(
  sportName: string,
  sportId: number,
  regionName?: string,
  regionId?: number,
  leagueName?: string,
  leagueId?: number,
): string {
  const parts = [
    sportName,
    String(sportId),
    regionName,
    regionId == null ? "" : String(regionId),
    leagueName,
    leagueId == null ? "" : String(leagueId),
  ]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  return `/event-view/pre-match/${parts.join("/")}`;
}

export function sportsbookHashHref(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/#sportsbook=${normalized}`;
}
