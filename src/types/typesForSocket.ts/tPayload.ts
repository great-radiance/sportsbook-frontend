import { SocketEnvelope } from "./tSocketEnvelop";

export type OddsUpdated = SocketEnvelope<
  "odds.updated",
  {
    marketId: string;
    selections: Array<{ selectionId: string; price: number }>;
  }
>;

export type EventStatusUpdated = SocketEnvelope<
  "event.status",
  {
    eventId: string;
    status: "LIVE" | "SUSPENDED" | "ENDED";
  }
>;

export type LiveScoreUpdated = SocketEnvelope<
  "live.score",
  {
    eventId: string;
    score: { home: number; away: number; period: string };
  }
>;
