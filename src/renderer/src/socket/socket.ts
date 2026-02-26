import { OrderPaymentUpdatedPayload } from "@shared/types";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let socketUrl = "";

export function initSocket(url: string) {
  socketUrl = `${url}/socket`;
}

export function connectSocket(token: string): Socket {
  if (!socketUrl) {
    throw new Error("Socket URL not initialized");
  }

  if (socket) return socket;

  socket = io(socketUrl, {
    transports: ["websocket"],
    query: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5
  });

  socket.on("connect", () => {
    console.log("socket connected");
  });

  socket.on("disconnect", (reason) => {
    console.log("socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("socket error:", err.message);
  });

  socket.onAny((event, ...args) => {
    console.log("EVENT:", event, args);
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
}

export function onOrderPaymentUpdated(callback: (data: OrderPaymentUpdatedPayload) => void) {
  const socket = getSocket();
  if (!socket) return;

  socket.on("orderPaymentUpdated", callback);

  return () => {
    socket.off("orderPaymentUpdated", callback);
  };
}
