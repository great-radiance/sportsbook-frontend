/* websocketClient.ts
   Lightweight websocket client that maps incoming messages to Store actions
   and dispatches them. Designed to be used with the StoreProvider's dispatch.
*/

type AnyAction = any;

export function createWebsocketClient(
  dispatch: (action: AnyAction) => void,
  url: string,
  opts?: { reconnectIntervalMs?: number; maxReconnectMs?: number },
) {
  let ws: WebSocket | null = null;
  let shouldReconnect = true;
  let reconnectInterval = opts?.reconnectIntervalMs ?? 1000;
  const maxReconnect = opts?.maxReconnectMs ?? 30_000;
  let backoff = reconnectInterval;

  function mapMessageToAction(msg: any): AnyAction | null {
    // Normalized message shape examples expected from server (adjust as needed):
    // { type: 'odd.updated', seq: 123, payload: { eventId, marketId, odd } }
    // { type: 'event.updated', seq: 456, payload: { eventId, updatedEvent } }
    // { type: 'live.updated', seq: 789, payload: { eventId, live } }
    // { type: 'snapshot', payload: { events: {...}, markets: {...}, odds: {...}, meta: {...} } }

    if (!msg || !msg.type) return null;

    switch (msg.type) {
      case "odd.updated":
      case "odd.update":
      case "odd":
        return {
          type: "odd.updated",
          payload: {
            seq: msg.seq,
            eventId: msg.payload?.eventId,
            marketId: msg.payload?.marketId,
            odd: msg.payload?.odd,
          },
        };

      case "event.updated":
      case "event":
        return {
          type: "event.updated",
          payload: {
            seq: msg.seq,
            eventId: msg.payload?.eventId,
            updatedEvent: msg.payload?.updatedEvent ?? msg.payload,
          },
        };

      case "live.updated":
      case "live":
        return {
          type: "live.updated",
          payload: {
            seq: msg.seq,
            eventId: msg.payload?.eventId,
            live: msg.payload?.live ?? msg.payload,
          },
        };

      case "market.status":
        return {
          type: "market.status",
          payload: {
            seq: msg.seq,
            eventId: msg.payload?.eventId,
            status: msg.payload?.status,
          },
        };

      case "event.status":
        return {
          type: "event.status",
          payload: {
            seq: msg.seq,
            eventId: msg.payload?.eventId,
            status: msg.payload?.status,
          },
        };

      case "snapshot":
      case "snapshot.merge":
        return {
          type: "snapshot.merge",
          payload: msg.payload,
        };

      case "connected":
        return {
          type: "socket.connected",
          connected: !!msg.payload?.connected,
        };

      default:
        // unknown message type — you can log or ignore
        console.debug("ws: unknown msg type", msg.type);
        return null;
    }
  }

  function connect() {
    if (ws) ws.close();
    ws = new WebSocket(url);

    ws.onopen = () => {
      backoff = reconnectInterval; // reset backoff
      dispatch({ type: "socket.connected", connected: true });
      console.info("ws: connected", url);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const action = mapMessageToAction(msg);
        if (action) dispatch(action);
      } catch (e) {
        console.error("ws: failed to parse message", e);
      }
    };

    ws.onclose = (ev) => {
      console.warn("ws: closed", ev.code, ev.reason);
      dispatch({ type: "socket.connected", connected: false });
      ws = null;
      if (shouldReconnect) {
        const timeout = Math.min(backoff, maxReconnect);
        setTimeout(() => connect(), timeout);
        backoff = Math.min(backoff * 1.5, maxReconnect);
      }
    };

    ws.onerror = (err) => {
      console.error("ws: error", err);
      // close will trigger reconnect
      try {
        ws?.close();
      } catch (e) {}
    };
  }

  function close() {
    shouldReconnect = false;
    try {
      ws?.close();
    } catch (e) {}
    ws = null;
  }

  function send(data: any) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("ws: send error", e);
      return false;
    }
  }

  return { connect, close, send };
}
