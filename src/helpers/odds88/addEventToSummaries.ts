import type { MatchDataResponse } from "@/api/matches/apiGetMatchData";
import type { tCounts, tSportResponse } from "@/api/sidebar/apiGetSummaryArray";
import {
  outRightSummarySports,
  summarySports,
  summarySportsLive,
  type summaryData,
} from "@/state/summarySports";
import type { tEventModel } from "@/types/typesForSocket.ts/tEventModel";

function cloneSummaryData(summary: summaryData): tSportResponse {
  return JSON.parse(JSON.stringify(summary.data)) as tSportResponse;
}

function bumpCounts(
  counts: tCounts,
  sportId: number,
  regionId: number,
  leagueId: number,
): void {
  counts[sportId] ??= { total: 0, regions: {} };
  counts[sportId].total += 1;
  counts[sportId].regions ??= {};
  counts[sportId].regions![regionId] ??= { total: 0, leagues: {} };
  counts[sportId].regions![regionId].total += 1;
  const leagues = counts[sportId].regions![regionId].leagues!;
  leagues[leagueId] = (leagues[leagueId] ?? 0) + 1;
}

/** Insert `eventId` into summary tuple tree; returns true when newly added. */
function addEventIdToSummary(
  summary: summaryData,
  meta: {
    sportId: number;
    sportName: string;
    regionId: number;
    regionName: string;
    leagueId: number;
    leagueName: string;
  },
  eventId: number,
): boolean {
  const data = cloneSummaryData(summary);
  let sport = data.find((s) => s[0] === meta.sportId);
  if (!sport) {
    sport = [meta.sportId, meta.sportName, []];
    data.push(sport);
  }

  let regions = sport[2];
  if (!regions) {
    regions = [];
    sport[2] = regions;
  }

  let region = regions.find((r) => r[0] === meta.regionId);
  if (!region) {
    region = [meta.regionId, meta.regionName, []];
    regions.push(region);
  }

  let leagues = region[2];
  if (!leagues) {
    leagues = [];
    region[2] = leagues;
  }

  let league = leagues.find((l) => l[0] === meta.leagueId);
  if (!league) {
    league = [meta.leagueId, meta.leagueName, []];
    leagues.push(league);
  }

  const ids = league[2] ?? [];
  if (ids.includes(eventId)) return false;

  league[2] = [...ids, eventId];
  const counts = { ...summary.counts };
  bumpCounts(counts, meta.sportId, meta.regionId, meta.leagueId);

  summary.data = data;
  summary.counts = counts;
  summary.TotalCount = Object.values(counts).reduce((acc, c) => acc + c.total, 0);
  return true;
}

type SummaryKey = "prematch" | "live" | "outright";

function pickSummaryKey(isOutright: boolean, status: number): SummaryKey {
  if (isOutright) return "outright";
  if (status === 3) return "live";
  return "prematch";
}

function getSummarySignal(key: SummaryKey) {
  switch (key) {
    case "live":
      return summarySportsLive;
    case "outright":
      return outRightSummarySports;
    default:
      return summarySports;
  }
}

function metaFromMatch(event: MatchDataResponse) {
  const info = event.eventInfo;
  const sportId = info.sport?.id;
  const regionId = info.country?.id;
  const leagueId = info.competition?.id;
  if (!sportId || !regionId || !leagueId || !info.id) return null;

  return {
    sportId,
    sportName: info.sport.name ?? "",
    regionId,
    regionName: info.country.name ?? "",
    leagueId,
    leagueName: info.competition.name ?? "",
    eventId: info.id,
    status: info.status,
    isOutright: Boolean(info.isOutright),
  };
}

function metaFromStored(event: tEventModel) {
  const sportId = event.sport?.id;
  const regionId = event.region?.id;
  const leagueId = event.league?.id;
  if (!sportId || !regionId || !leagueId || !event.id) return null;

  return {
    sportId,
    sportName: event.sport.name ?? "",
    regionId,
    regionName: event.region.name ?? "",
    leagueId,
    leagueName: event.league.name ?? "",
    eventId: event.id,
    status: event.status,
    isOutright: Boolean(event.isOutright),
  };
}

/** Add event id to prematch, live, or outright summary (WS `EventSnapshot`). */
export function addEventIdToSummaries(
  source: MatchDataResponse | tEventModel,
): void {
  const meta =
    "eventInfo" in source
      ? metaFromMatch(source)
      : metaFromStored(source);
  if (!meta) return;

  const summarySig = getSummarySignal(
    pickSummaryKey(meta.isOutright, meta.status),
  );
  const target = summarySig.value;
  const draft: summaryData = {
    data: cloneSummaryData(target),
    counts: { ...target.counts },
    TotalCount: target.TotalCount,
  };

  const added = addEventIdToSummary(
    draft,
    {
      sportId: meta.sportId,
      sportName: meta.sportName,
      regionId: meta.regionId,
      regionName: meta.regionName,
      leagueId: meta.leagueId,
      leagueName: meta.leagueName,
    },
    meta.eventId,
  );

  if (added) {
    summarySig.value = { ...draft };
  }
}
