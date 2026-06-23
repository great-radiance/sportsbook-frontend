import { useEffect } from "preact/hooks";
import { io, type Socket } from "socket.io-client";
import { getAppConfig } from "@/shared/config/appConfig";
import { sportsbookStore } from "@/state/sportsbookStoreContext";
import {
  applyBetHistoryBetUpdate,
  applyBetHistoryCashoutUpdate,
  type BetUpdateEvent,
  type CashoutUpdateEvent,
} from "@/helpers/betHistoryUpdates";

const SOCKET_PATH = "/bets";

export function useBetHistorySocket(enabled: boolean): void {
  useEffect(() => {
    const { xUserId, xOperatorId } = getAppConfig();
    if (!enabled || !xUserId || !xOperatorId) return;

    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
    const socket: Socket = io(`${baseUrl}${SOCKET_PATH}`, {
      autoConnect: true,
      transports: ["websocket", "polling"],
    });

    const subscribe = () => {
      socket.emit("subscribe", { userId: xUserId, operatorId: xOperatorId });
    };

    socket.on("connect", subscribe);

    socket.on("cashout:update", (update: CashoutUpdateEvent) => {
      sportsbookStore.betHistoryState.value = applyBetHistoryCashoutUpdate(
        sportsbookStore.betHistoryState.value,
        update,
      );
    });

    socket.on("bet:update", (update: BetUpdateEvent) => {
      sportsbookStore.betHistoryState.value = applyBetHistoryBetUpdate(
        sportsbookStore.betHistoryState.value,
        update,
      );
    });

    return () => {
      socket.emit("unsubscribe", { userId: xUserId, operatorId: xOperatorId });
      socket.disconnect();
    };
  }, [enabled]);
}
