import { convertFromArrayToSnapshot } from "@/helpers/convertFromArrayToSnapshot";
import type { MatchDataResponse } from "@/api/matches/apiGetMatchData";

type RestSelection = {
  id: number;
  name: string;
  probability?: number;
  price: number;
  originalPrice?: number;
  status?: number;
  settlement?: number;
  deadHeatFactor?: number;
  extraParameters?: Record<string, string>;
  isBetBuilderSupported?: boolean;
  competitorId?: number;
  startingPrice?: number | null;
  competitionId?: number;
};

type RestMarket = {
  id: number;
  name: string;
  tradingStatus: number;
  type?: number;
  isBestLine?: boolean;
  parameters?: Record<string, string>;
  extraParameters?: Record<string, string>;
  isBetBuilderSupported?: boolean;
  selections?: RestSelection[];
};

function isCompactTuple(v: unknown): v is unknown[] {
  return Array.isArray(v) && (v.length === 0 || Array.isArray(v[0]));
}

function isRestSelection(v: unknown): v is RestSelection {
  return (
    typeof v === "object" &&
    v != null &&
    "id" in v &&
    "price" in v &&
    !Array.isArray(v)
  );
}

function isRestMarket(v: unknown): v is RestMarket {
  return (
    typeof v === "object" &&
    v != null &&
    "id" in v &&
    Array.isArray((v as RestMarket).selections) &&
    ((v as RestMarket).selections?.length === 0 ||
      isRestSelection((v as RestMarket).selections?.[0]))
  );
}

function normalizeRestSelection(s: RestSelection) {
  return {
    id: Number(s.id),
    name: String(s.name ?? ""),
    probability: Number(s.probability ?? 0),
    price: Number(s.price),
    originalPrice: Number(s.originalPrice ?? s.price),
    status: Number(s.status ?? 0),
    settlement: Number(s.settlement ?? 0),
    deadHeatFactor: Number(s.deadHeatFactor ?? 0),
    extraParameters: s.extraParameters ?? {},
    isBetBuilderSupported: Boolean(s.isBetBuilderSupported),
    competitorId: Number(s.competitorId ?? 0),
    startingPrice: s.startingPrice ?? 0,
    competitionId: Number(s.competitionId ?? 0),
  };
}

function normalizeRestMarket(m: RestMarket) {
  return {
    id: Number(m.id),
    name: String(m.name ?? ""),
    tradingStatus: Number(m.tradingStatus ?? 0),
    type: Number(m.type ?? 0),
    isBestLine: Boolean(m.isBestLine),
    parameters: m.parameters ?? {},
    extraParameters: m.extraParameters ?? {},
    isBetBuilderSupported: Boolean(m.isBetBuilderSupported),
    selections: (m.selections ?? []).map(normalizeRestSelection),
  };
}

/** `{ type: 7, eventId, sportId, locationId, leagueId, markets: [...] }` from WS. */
function marketsDeltaToMatchResponse(
  o: Record<string, unknown>,
): MatchDataResponse | null {
  const eventId = Number(o.eventId);
  if (!Number.isFinite(eventId) || eventId <= 0) return null;
  if (!Array.isArray(o.markets)) return null;

  const markets = o.markets.filter(isRestMarket).map(normalizeRestMarket);
  if (markets.length === 0) return null;

  const sportId = Number(o.sportId ?? 0);
  const locationId = Number(o.locationId ?? o.regionId ?? 0);
  const leagueId = Number(o.leagueId ?? 0);

  return {
    eventInfo: {
      id: eventId,
      name: "",
      status: 0,
      tradingStatus: 0,
      statusDescription: "",
      sport: { id: sportId, name: "" },
      country: { id: locationId, name: "" },
      competition: { id: leagueId, name: "" },
      season: { id: 0, name: "" },
      competitors: [],
      startTime: "",
      isOutright: false,
      isBetBuilderSupported: false,
      customDisplayData: null,
      mappingInfo: [],
    },
    markets,
    scoreboard: o.scoreboard ?? null,
    betCancellations: [],
    time: 0,
    eventId,
    version: Number(o.version ?? 0),
    correlationId: String(o.correlationId ?? ""),
    creationTime: String(o.creationTime ?? ""),
    sportId,
    locationId,
    leagueId,
    updateSequence: Number(o.updateSequence ?? 0),
    lastUpdatedTime: Number(o.lastUpdatedTime ?? 0),
  };
}

/** Compact array or REST-shaped event → `MatchDataResponse` for store/patch. */
export function normalizeWsEventPayload(raw: unknown): MatchDataResponse | null {
  if (raw == null) return null;

  if (Array.isArray(raw)) {
    if (!isCompactTuple(raw)) return null;
    try {
      return convertFromArrayToSnapshot(raw) as MatchDataResponse;
    } catch {
      return null;
    }
  }

  if (typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  if (o.eventInfo && o.markets) {
    return o as MatchDataResponse;
  }

  if (Array.isArray(o.event)) {
    return normalizeWsEventPayload(o.event);
  }

  if (Array.isArray(o.data) && o.type == null) {
    return normalizeWsEventPayload(o.data);
  }

  if (o.eventId != null && Array.isArray(o.markets)) {
    if (isRestMarket(o.markets[0]) || o.markets.length === 0) {
      return marketsDeltaToMatchResponse(o);
    }

    if (isCompactTuple(o.markets)) {
      const eventId = Number(o.eventId);
      const stubInfo = [
        eventId,
        "",
        0,
        0,
        [Number(o.sportId ?? 0), ""],
        [Number(o.locationId ?? o.regionId ?? 0), ""],
        [Number(o.leagueId ?? 0), ""],
        null,
        [],
        "",
        false,
        false,
      ];
      try {
        return convertFromArrayToSnapshot([
          stubInfo,
          o.markets,
          o.scoreboard ?? null,
        ]) as MatchDataResponse;
      } catch {
        return null;
      }
    }
  }

  return null;
}
