import { useEffect } from "preact/hooks";
import { useSocket } from "../context/SocketContext";

const useSocketEvent = (event: string, handler: (data: any) => void): void => {
  const socket = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on(event, handler);
      console.log("socket.on", event, handler);
    }

    return () => {
      if (socket) {
        socket.off(event, handler);
        console.log("socket.off", event, handler);
      }
    };
  }, [socket, event, handler]);
};

export default useSocketEvent;
