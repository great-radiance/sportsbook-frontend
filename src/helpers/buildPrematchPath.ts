import type { summaryData } from "@/state/summarySports";

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

/** Resolve full prematch URL from summary tree names (sport / region / league). */
export function prematchPathForLeagueNames(
  summary: summaryData,
  sportName: string,
  regionName: string,
  leagueName: string,
): string | null {
  const sportKey = sportName.trim();
  const regionKey = regionName.trim();
  const leagueKey = leagueName.trim();
  if (!sportKey || !regionKey || !leagueKey) return null;

  for (const sport of summary.data ?? []) {
    const sName = String(sport[1] ?? "").trim();
    if (sName !== sportKey) continue;
    const sportId = sport[0] as number;
    for (const region of sport[2] ?? []) {
      const rName = String(region[1] ?? "").trim();
      if (rName !== regionKey) continue;
      const regionId = region[0] as number;
      for (const league of region[2] ?? []) {
        const lName = String(league[1] ?? "").trim();
        if (lName !== leagueKey) continue;
        const leagueId = league[0] as number;
        return buildPrematchPath(
          sName,
          sportId,
          rName,
          regionId,
          lName,
          leagueId,
        );
      }
    }
  }
  return null;
}
