import { OrderPaymentUpdatedPayload, SelectingChairPayload } from "@shared/types";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let socketUrl = "";
let currentSocketToken: string | null = null;

export function initSocket(url: string) {
  socketUrl = `${url}/socket`;
}

export function connectSocket(token: string): Socket {
  if (!socketUrl) {
    throw new Error("Socket URL not initialized");
  }

  if (socket && currentSocketToken === token) return socket;

  if (socket && currentSocketToken !== token) {
    socket.disconnect();
    socket = null;
  }

  socket = io(socketUrl, {
    transports: ["websocket"],
    query: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5
  });
  currentSocketToken = token;

  socket.on("connect", () => {
    console.log("socket connected");
  });

  socket.on("disconnect", (reason) => {
    console.log("socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("socket error:", err.message);
  });

  socket.on("hello", function (data) {
    console.log("hello", data);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  currentSocketToken = null;
}

export function onOrderPaymentUpdated(callback: (data: OrderPaymentUpdatedPayload) => void) {
  const socket = getSocket();
  if (!socket) return;

  socket.on("orderPaymentUpdated", callback);

  return () => {
    socket.off("orderPaymentUpdated", callback);
  };
}

export function onSelectingChairsUpdate(callback: (data: SelectingChairPayload) => void) {
  const socket = getSocket();
  if (!socket) return;

  socket.on("selecting_chair_update", callback);

  return () => {
    socket.off("selecting_chair_update", callback);
  };
}
