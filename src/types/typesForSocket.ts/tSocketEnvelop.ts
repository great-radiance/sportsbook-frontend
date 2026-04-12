export type SocketEnvelope<TType extends string, TPayload> = {
  type: TType; // e.g. "odds.updated" | "event.status" | "live.score" | "market.updated" | "event.updated" | "stats.updated"
  // ts: number; // server time
  seq?: number; // monotonic sequence per channel/connection
  // correlationId?: string; // optional for debugging
  payload: TPayload;
};
