"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface UseSocketProps {
  token: string;
}

export function useSocket({ token }: UseSocketProps) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      path: "/socket",
      transports: ["websocket"],
      query: { token },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🟢 Connected to socket:", socket.id);
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Disconnected");
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.log("⚠️ Connect error:", err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Trả ra các hàm thao tác thay vì socket trực tiếp
  const emit = (event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  };

  return { emit, connected };
}
