import type { MatchDataResponse } from "@/api/matches/apiGetMatchData";
import {
  storeEvent,
  syncSelectionsStoreForEvent,
  syncSelectionsStoreFromIncomingMarkets,
} from "@/helpers/storeEvent";
import {
  storeState,
  selectionStoreKey,
  selectionsStoreState,
  willBeDeletedEventIds,
} from "@/state/storeState";
import { addEventIdToSummaries } from "./addEventToSummaries";
import { normalizeWsEventPayload } from "./normalizeWsEventPayload";
import { patchEventMarkets } from "./patchEventMarkets";
import {
  isTerminalEventStatus,
  // removeEventFromSummariesAndStore,
} from "./removeEventFromSummaries";

/** Delta message `type` (integer). */
export const WS_DELTA = {
  EVENT_STATUS: 1,
  EVENT_CHANGED: 2,
  DEPRECATED: 3,
  SCOREBOARD: 4,
  BET_CANCEL: 5,
  EVENT_SNAPSHOT: 6,
  MARKETS: 7,
} as const;

const TYPE_BY_NAME: Record<string, number> = {
  EventStatusChanged: WS_DELTA.EVENT_STATUS,
  EventChanged: WS_DELTA.EVENT_CHANGED,
  ScoreboardChanged: WS_DELTA.SCOREBOARD,
  BetCancel: WS_DELTA.BET_CANCEL,
  BetsCancellation: WS_DELTA.BET_CANCEL,
  EventSnapshot: WS_DELTA.EVENT_SNAPSHOT,
  MarketsChanged: WS_DELTA.MARKETS,
};

export type Odds88WsContext = {
  activeEventId?: number;
  sportIdParam?: number;
  regionIdParam?: number;
};

type WsDelta = {
  type?: number | string;
  eventId?: number;
  event?: unknown;
  markets?: unknown;
  data?: unknown;
  scoreboard?: unknown;
  status?: string | number;
  statusDescription?: string;
  startTime?: string;
  name?: string;
  selectionId?: number;
  marketId?: number;
};

export type Odds88WsMessage =
  | { type: "snapshot"; data?: unknown[] }
  | { type: "delta"; data?: unknown[] }
  | { type: "error"; message?: string };

function deltaType(raw: unknown): number | null {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") return TYPE_BY_NAME[raw] ?? null;
  return null;
}

function routeMatches(
  ctx: Odds88WsContext,
  sportId?: number,
  regionId?: number,
): boolean {
  if (ctx.sportIdParam != null && sportId !== ctx.sportIdParam) return false;
  if (ctx.regionIdParam != null && regionId !== ctx.regionIdParam) return false;
  return true;
}

/** Store full event when URL sport/region match, or player is on that event page. */
function shouldStoreEvent(
  ctx: Odds88WsContext,
  event: MatchDataResponse,
): boolean {
  const id = event.eventInfo?.id;
  if (id && ctx.activeEventId === id) return true;
  if (ctx.sportIdParam == null && ctx.regionIdParam == null) return false;
  return routeMatches(
    ctx,
    event.eventInfo.sport?.id,
    event.eventInfo.country?.id,
  );
}

function hasEvent(eventId: number): boolean {
  return Boolean(storeState.value[eventId]?.value?.id);
}

function logActive(
  ctx: Odds88WsContext,
  eventId: number | undefined,
  label: string,
  payload: unknown,
): void {
  if (ctx.activeEventId && eventId === ctx.activeEventId) {
    console.log(`[odds88 ws] ${label}`, payload);
  }
}

/** Parse route `sportIdParam` / `regionIdParam` for WS store gating. */
export function parseRouteIds(
  sportIdParam?: string,
  regionIdParam?: string,
): Pick<Odds88WsContext, "sportIdParam" | "regionIdParam"> {
  const sportId = parseInt(sportIdParam ?? "", 10);
  const regionId = parseInt(regionIdParam ?? "", 10);
  return {
    sportIdParam: Number.isFinite(sportId) && sportId > 0 ? sportId : undefined,
    regionIdParam:
      Number.isFinite(regionId) && regionId > 0 ? regionId : undefined,
  };
}

function applyEventSnapshot(change: WsDelta, ctx: Odds88WsContext): void {
  const event = normalizeWsEventPayload(change.event ?? change.data ?? change);
  if (!event?.eventInfo?.id) return;

  const id = event.eventInfo.id;
  logActive(ctx, id, "EventSnapshot (6)", event);
  addEventIdToSummaries(event);

  if (!shouldStoreEvent(ctx, event)) return;

  if (hasEvent(id)) {
    patchEventMarkets({ ...event, eventId: id });
  } else {
    storeEvent({ ...event, eventId: id });
  }
  syncSelectionsStoreForEvent(id);
}

function applyMarketsChanged(change: WsDelta): void {
  const eventId = Number(change.eventId);
  if (!eventId) return;

  const event = normalizeWsEventPayload(change);
  const markets = (event?.markets ?? []).map((m) => ({
    id: m.id,
    tradingStatus: m.tradingStatus,
    selections: (m.selections ?? []).map((s) => ({
      id: s.id,
      price: s.price,
      originalPrice: s.originalPrice,
      status: s.status,
    })),
  }));

  if (hasEvent(eventId)) {
    if (event) patchEventMarkets({ ...event, eventId });
    syncSelectionsStoreForEvent(eventId);
  } else if (markets.length) {
    syncSelectionsStoreFromIncomingMarkets(
      eventId,
      markets,
      event?.eventInfo?.tradingStatus,
    );
  }
}

function applyEventStatus(change: WsDelta, ctx: Odds88WsContext): void {
  const eventId = Number(change.eventId);
  if (!eventId || !hasEvent(eventId)) return;

  const evSig = storeState.value[eventId]!;
  const prev = evSig.value;
  const status = change.status ?? prev.status;

  if (isTerminalEventStatus(status)) {
    // removeEventFromSummariesAndStore(eventId, prev, {
    //   keepIfViewingEventId: ctx.activeEventId,
    // });
    if (ctx.activeEventId === eventId) {
      willBeDeletedEventIds.value = eventId;
    }
    return;
  }

  evSig.value = {
    ...prev,
    status: typeof status === "number" ? status : prev.status,
    statusDescription:
      (change.statusDescription as string) ?? prev.statusDescription,
    startTime: (change.startTime as string) ?? prev.startTime,
    name: prev.name,
  };
  syncSelectionsStoreForEvent(eventId);
}

function applyEventChanged(change: WsDelta): void {
  const eventId = Number(change.eventId);
  if (!eventId || !hasEvent(eventId)) return;

  const evSig = storeState.value[eventId]!;
  evSig.value = {
    ...evSig.value,
    name: evSig.value.name,
    startTime: (change.startTime as string) ?? evSig.value.startTime,
    scoreboard: change.scoreboard ?? evSig.value.scoreboard,
  };
}

function applyScoreboard(change: WsDelta): void {
  const eventId = Number(change.eventId);
  if (!eventId || !hasEvent(eventId)) return;

  const evSig = storeState.value[eventId]!;
  evSig.value = {
    ...evSig.value,
    scoreboard: change.scoreboard ?? change.data ?? evSig.value.scoreboard,
  };
}

function applyBetCancel(change: WsDelta): void {
  const eventId = Number(change.eventId);
  if (!eventId || !hasEvent(eventId)) {
    const marketId = change.marketId != null ? Number(change.marketId) : NaN;
    const selectionId =
      change.selectionId != null ? Number(change.selectionId) : NaN;
    if (
      Number.isFinite(marketId) &&
      Number.isFinite(selectionId) &&
      selectionsStoreState.value[
        selectionStoreKey(eventId, marketId, selectionId)
      ]
    ) {
      const key = selectionStoreKey(eventId, marketId, selectionId);
      const sig = selectionsStoreState.value[key]!;
      sig.value = { ...sig.value, status: 3, mv: 0 };
    }
    return;
  }

  const evSig = storeState.value[eventId]!;
  const marketId = change.marketId;
  const selectionId = change.selectionId;
  const mKey = marketId != null ? Number(marketId) : NaN;
  if (!Number.isFinite(mKey) || !evSig.value.markets[mKey]) return;

  const mSig = evSig.value.markets[mKey];
  for (const sel of mSig.value.selections) {
    if (selectionId != null && sel.value.id !== selectionId) continue;
    sel.value = { ...sel.value, status: 3, mv: 0 };
  }
  syncSelectionsStoreForEvent(eventId);
}

function applyDelta(change: WsDelta, ctx: Odds88WsContext): void {
  const t = deltaType(change.type);
  if (t == null) return;

  const eventId = Number(change.eventId);
  logActive(ctx, eventId, `delta type ${t}`, change);

  switch (t) {
    case WS_DELTA.EVENT_SNAPSHOT:
      applyEventSnapshot(change, ctx);
      break;
    case WS_DELTA.MARKETS:
      applyMarketsChanged(change);
      break;
    case WS_DELTA.EVENT_STATUS:
      applyEventStatus(change, ctx);
      break;
    case WS_DELTA.EVENT_CHANGED:
      applyEventChanged(change);
      break;
    case WS_DELTA.SCOREBOARD:
      applyScoreboard(change);
      break;
    case WS_DELTA.BET_CANCEL:
      applyBetCancel(change);
      break;
    case WS_DELTA.DEPRECATED:
      break;
    default:
      break;
  }
}

export function parseOdds88WsMessage(raw: string): Odds88WsMessage | null {
  try {
    return JSON.parse(raw) as Odds88WsMessage;
  } catch {
    return null;
  }
}

export function handleOdds88WsMessage(
  msg: Odds88WsMessage,
  ctx: Odds88WsContext,
): "error" | "ok" {
  if (msg.type === "error") return "error";

  if (msg.type === "delta" && Array.isArray(msg.data)) {
    for (const item of msg.data) {
      if (item && typeof item === "object") {
        applyDelta(item as WsDelta, ctx);
      }
    }
    return "ok";
  }

  /* Bulk snapshot on connect — lists come from REST; deltas keep state fresh. */
  if (msg.type === "snapshot") return "ok";

  return "ok";
}
