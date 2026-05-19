import { useEffect, useRef } from "preact/hooks";
import { getOdds88WebSocketUrl } from "@/helpers/odds88/getOdds88WebSocketUrl";
import {
  handleOdds88WsMessage,
  parseOdds88WsMessage,
  type Odds88WsContext,
} from "@/helpers/odds88/applyOdds88WsMessage";
import { odds88WsConnected } from "@/state/odds88WsState";
import { getAppConfig } from "@/shared/config/appConfig";

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

export type UseOdds88WebSocketOptions = Odds88WsContext & {
  enabled?: boolean;
};

/**
 * Native WebSocket feed — integration guide § Real-Time Odds.
 * `snapshot` on connect, then `delta` updates; reconnect with exponential back-off.
 */
export function useOdds88WebSocket(options: UseOdds88WebSocketOptions = {}) {
  const {
    activeEventId,
    sportIdParam,
    regionIdParam,
    enabled = true,
  } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const reconnectTimerRef = useRef<number | null>(null);
  const shouldRunRef = useRef(true);

  useEffect(() => {
    shouldRunRef.current = enabled;
    if (!enabled) {
      odds88WsConnected.value = false;
      wsRef.current?.close();
      wsRef.current = null;
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      return;
    }

    let lang = "en";
    try {
      lang = getAppConfig().lang || "en";
    } catch {
      /* config not ready yet */
    }

    const connect = () => {
      if (!shouldRunRef.current) return;

      const url = getOdds88WebSocketUrl({ lang });
      if (!url) return;

      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        backoffRef.current = INITIAL_BACKOFF_MS;
        odds88WsConnected.value = true;
      };

      ws.onmessage = (ev) => {
        const msg = parseOdds88WsMessage(String(ev.data ?? ""));
        if (!msg) return;

        const result = handleOdds88WsMessage(msg, {
          activeEventId,
          sportIdParam,
          regionIdParam,
        });
        if (result === "error") {
          ws.close();
        }
      };

      ws.onclose = () => {
        odds88WsConnected.value = false;
        wsRef.current = null;
        if (!shouldRunRef.current) return;

        const delay = backoffRef.current;
        backoffRef.current = Math.min(
          Math.round(backoffRef.current * 1.5),
          MAX_BACKOFF_MS,
        );
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      };
    };

    connect();

    return () => {
      shouldRunRef.current = false;
      odds88WsConnected.value = false;
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, activeEventId, sportIdParam, regionIdParam]);
}
