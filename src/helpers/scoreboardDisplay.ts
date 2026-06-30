type ScoreboardResult = {
  competitorPosition?: number;
  value?: number | string;
};

export const INCIDENT_TYPE = {
  YellowCard: 0,
  RedCard: 1,
  Corners: 2,
} as const;

export type RawScoreboard = {
  results?: ScoreboardResult[];
  time?: number;
  homeGameScore?: number | string;
  awayGameScore?: number | string;
  incidents?: {
    type: number;
    competitorPosition: number;
    count: number;
  }[];
};

export function getCompetitorIncidentCount(
  scoreboard: RawScoreboard | null | undefined,
  incidentType: number,
  position: 1 | 2,
): number {
  if (!scoreboard?.incidents?.length) return 0;
  const incident = scoreboard.incidents.find(
    (entry) =>
      entry.type === incidentType && entry.competitorPosition === position,
  );
  return incident?.count ?? 0;
}

export function getCompetitorScore(
  scoreboard: RawScoreboard | null | undefined,
  position: 1 | 2,
): number {
  if (!scoreboard) return 0;
  const fromResults = scoreboard.results?.find(
    (r) => r.competitorPosition === position,
  )?.value;
  const parsedResult = Number(fromResults);
  if (Number.isFinite(parsedResult)) return parsedResult;
  const fallback =
    position === 1 ? scoreboard.homeGameScore : scoreboard.awayGameScore;
  const parsedFallback = Number(fallback);
  return Number.isFinite(parsedFallback) ? parsedFallback : 0;
}
