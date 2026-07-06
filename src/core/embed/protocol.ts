/** Shared postMessage contract between sportsbook embed and host operator site. */

export const SPORTSBOOK_EMBED_SOURCE = "sportsbook-embed" as const;
export const SPORTSBOOK_HOST_SOURCE = "sportsbook-host" as const;

export type SportsbookEmbedOutboundMessage =
  | { source: typeof SPORTSBOOK_EMBED_SOURCE; type: "ready" }
  | {
      source: typeof SPORTSBOOK_EMBED_SOURCE;
      type: "resize";
      payload: { height: number };
    }
  | {
      source: typeof SPORTSBOOK_EMBED_SOURCE;
      type: "navigation";
      payload: { path: string };
    }
  | { type: "click"; target: "loginButton" | "depositButton" };

export type SportsbookHostInboundMessage =
  | {
      source: typeof SPORTSBOOK_HOST_SOURCE;
      type: "session";
      payload: {
        lang?: string;
        xUserId?: string;
        xUserName?: string;
        xUserBalance?: number;
        currency?: string;
        xSportsbookToken?: string;
      };
    }
  | {
      source: typeof SPORTSBOOK_HOST_SOURCE;
      type: "navigate";
      payload: { path: string };
    };

export function isSportsbookHostMessage(
  data: unknown,
): data is SportsbookHostInboundMessage {
  if (!data || typeof data !== "object") return false;
  const msg = data as Record<string, unknown>;
  return msg.source === SPORTSBOOK_HOST_SOURCE;
}
