"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { logger } from "@/lib/logger";

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let active = true;
    let currentSocket: Socket | null = null;
    const connectSocket = async () => {
      try {
        const res = await fetch("/api/socket-auth");
        if (!res.ok) return logger.error("Socket authentication failed", { status: res.status });

        const data = await res.json();
        if (!active) return;

        const newSocket = io(data.socketUrl, {
          transports: ["websocket"],
          withCredentials: true,
        });
        currentSocket = newSocket;
        setSocket(newSocket);

        newSocket.on("connect", () => {
          logger.socketEvent("connect");
        });

        newSocket.on("disconnect", () => {
          logger.socketEvent("disconnect");
        });
      } catch (error) {
        logger.error("Socket authentication error", { error });
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
