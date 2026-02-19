import { useAutoUpdater } from "@renderer/hooks/useAutoUpdater";
import { UpdaterContextType } from "@shared/types";
import { createContext, useContext, ReactNode } from "react";

const UpdaterContext = createContext<UpdaterContextType | null>(null);

export function UpdaterProvider({ children }: { children: ReactNode }) {
  const updater = useAutoUpdater();

  return <UpdaterContext.Provider value={updater}>{children}</UpdaterContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUpdater(): UpdaterContextType {
  const ctx = useContext(UpdaterContext);

  if (!ctx) {
    throw new Error("UpdaterProvider missing");
  }

  return ctx;
}
