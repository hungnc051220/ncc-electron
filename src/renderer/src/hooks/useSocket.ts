import { getSocket } from "@renderer/socket/socket";
import { useEffect } from "react";

export interface SocketEvents {
  orderPaymentUpdated: {
    orderStatus?: number;
  };
}

export function useSocket<K extends keyof SocketEvents>(
  event: K,
  handler: (payload: SocketEvents[K]) => void
) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const typedHandler = handler as (...args: unknown[]) => void;

    socket.on(event as string, typedHandler);

    return () => {
      socket.off(event as string, typedHandler);
    };
  }, [event, handler]);
}
