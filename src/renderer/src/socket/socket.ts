import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectSocket(token: string) {
  if (socket) return socket;

  socket = io(import.meta.env.VITE_API_SOCKET_URL, {
    path: "/socket",
    transports: ["websocket"],
    query: { token },
    autoConnect: true,
    reconnection: true
  });

  socket.on("connect", () => {
    console.log("socket connected");
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected");
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
