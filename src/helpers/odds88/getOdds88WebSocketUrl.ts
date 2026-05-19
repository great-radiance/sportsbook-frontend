export type Odds88WsUrlOptions = {
  lang?: string;
};

/** `wss://{host}/ws/odds88/events` — full feed, no sport/league filters. */
export function getOdds88WebSocketUrl(options?: Odds88WsUrlOptions): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
  if (!apiBase) {
    console.warn("VITE_API_BASE_URL missing — odds88 WebSocket disabled");
    return "";
  }

  let host: string;
  try {
    host = new URL(apiBase).host;
  } catch {
    console.warn("Invalid VITE_API_BASE_URL — odds88 WebSocket disabled");
    return "";
  }

  const isSecure =
    typeof window !== "undefined" && window.location?.protocol === "https:";
  const wsProtocol = isSecure || apiBase.startsWith("https") ? "wss:" : "ws:";
  const wsUrl = new URL(`${wsProtocol}//${host}/ws/odds88/events`);

  if (options?.lang) wsUrl.searchParams.set("lang", options.lang);

  return wsUrl.toString();
}
