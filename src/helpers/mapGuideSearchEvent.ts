import type { SearchEventRow } from "@/types/searchEvent";
import { buildEventViewPath } from "@/helpers/buildPrematchPath";

export type GuideSearchEventInfo = {
  id?: number;
  name?: string;
  startTime?: string;
  sport?: { id?: number; name?: string };
  country?: { id?: number; name?: string };
  region?: { id?: number; name?: string };
  competition?: { id?: number; name?: string };
  competitors?: { id?: number; name?: string; type?: string }[];
};

export type GuideSearchEventItem = {
  eventId?: number;
  eventInfo?: GuideSearchEventInfo;
  markets?: unknown[];
};

function mapMarketName(m: unknown): string {
  if (!m || typeof m !== "object") return "";
  const o = m as Record<string, unknown>;
  return String(o.name ?? o.marketName ?? "");
}

export function mapGuideSearchEventToRow(item: GuideSearchEventItem): SearchEventRow {
  const info = item.eventInfo ?? {};
  const competitors = info.competitors ?? [];
  const home =
    competitors.find((c) => c.type === "home") ?? competitors[0];
  const away =
    competitors.find((c) => c.type === "away") ?? competitors[1] ?? competitors[0];

  const startRaw = info.startTime;
  const startTime = startRaw ? new Date(startRaw).getTime() : 0;

  return {
    eventId: item.eventId ?? info.id ?? 0,
    sportName: info.sport?.name ?? "",
    sportId: info.sport?.id ?? 0,
    regionName: info.region?.name ?? info.country?.name ?? "",
    regionId: info.region?.id ?? info.country?.id ?? 0,
    leagueName: info.competition?.name ?? "",
    leagueId: info.competition?.id ?? 0,
    participants: [home?.name ?? "", away?.name ?? ""],
    startTime: Number.isFinite(startTime) ? startTime : 0,
    markets: (item.markets ?? [])
      .map((m) => ({ name: mapMarketName(m) }))
      .filter((m) => m.name),
  };
}

export function searchRowPrematchPath(row: SearchEventRow): string {
  return buildEventViewPath(
    "pre-match",
    row.sportName,
    row.sportId,
    row.regionName || "all",
    row.regionId || 0,
    row.leagueName,
    row.leagueId || 0,
    row.eventId,
  );
}
