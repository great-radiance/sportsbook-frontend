/** Matches `useRouteParams` / sidebar: `/event-view/pre-match/{sport}/{sportId}/...` */
export function buildPrematchPath(
  sportName: string,
  sportId: number | string,
  regionName?: string,
  regionId?: number | string,
  leagueName?: string,
  leagueId?: number | string,
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

// export type ResolvedLeague = {
//   sportId: number;
//   sportName: string;
//   regionId: number;
//   regionName: string;
//   leagueId: number;
//   leagueName: string;
//   path: string;
// };

// /** Resolve numeric IDs and prematch URL from summary tree names. */
// export function resolveLeagueFromNames(
//   summary: summaryData,
//   sportName: string,
//   regionName: string,
//   leagueName: string,
// ): ResolvedLeague | null {
//   const sportKey = sportName.trim();
//   const regionKey = regionName.trim();
//   const leagueKey = leagueName.trim();
//   if (!sportKey || !regionKey || !leagueKey) return null;

//   for (const sport of summary.data ?? []) {
//     const sName = String(sport[1] ?? "").trim();
//     if (sName !== sportKey) continue;
//     const sportId = sport[0] as number;
//     for (const region of sport[2] ?? []) {
//       const rName = String(region[1] ?? "").trim();
//       if (rName !== regionKey) continue;
//       const regionId = region[0] as number;
//       for (const league of region[2] ?? []) {
//         const lName = String(league[1] ?? "").trim();
//         if (lName !== leagueKey) continue;
//         const leagueId = league[0] as number;
//         return {
//           sportId,
//           sportName: sName,
//           regionId,
//           regionName: rName,
//           leagueId,
//           leagueName: lName,
//           path: buildPrematchPath(
//             sName,
//             sportId,
//             rName,
//             regionId,
//             lName,
//             leagueId,
//           ),
//         };
//       }
//     }
//   }
//   return null;
// }

// /** Resolve full prematch URL from summary tree names (sport / region / league). */
// export function prematchPathForLeagueNames(
//   summary: summaryData,
//   sportName: string,
//   regionName: string,
//   leagueName: string,
// ): string | null {
//   return (
//     resolveLeagueFromNames(summary, sportName, regionName, leagueName)?.path ??
//     null
//   );
// }
