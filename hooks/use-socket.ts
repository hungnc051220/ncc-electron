"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let active = true;
    let currentSocket: Socket | null = null;
    const connectSocket = async () => {
      try {
        const res = await fetch("/api/socket-auth");
        if (!res.ok) return console.error("Socket auth error");

        const data = await res.json();
        if (!active) return;

        const newSocket = io(data.socketUrl, {
          transports: ["websocket"],
          withCredentials: true,
        });
        currentSocket = newSocket;
        setSocket(newSocket);

        newSocket.on("connect", () => {
          console.log("Socket connected");
        });

        newSocket.on("disconnect", () => {
          console.log("Socket disconnected");
        });
      } catch (error) {
        console.error("Socket auth error", error);
      }
    };

    connectSocket();

    return () => {
      active = false;
      currentSocket?.disconnect();
      setSocket(null);
    };
  }, []);

  return socket;
};
