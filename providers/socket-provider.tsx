"use client";

import { createContext, useContext } from "react";
import { useSocket } from "@/hooks/use-socket";
import type { Socket } from "socket.io-client";

export type SocketContextType = Socket | null;

const SocketContext = createContext<SocketContextType>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socket = useSocket();
  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(SocketContext);
