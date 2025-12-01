import { io } from "socket.io-client";
import { getSocketUrl } from "@/lib/env";

export const socket = io(getSocketUrl(), {
  withCredentials: true, // cookie sẽ tự gửi theo
  transports: ["websocket"],
});
