import { createRoot } from "react-dom/client";
import App from "./App";
import "./schedule.css";

const debug = (
  window as Window & {
    __scheduleDebug?: {
      bundle: (name: string) => void;
      report: (
        type: string,
        message: string,
        source: string,
        line: number,
        column: number,
        stack?: string
      ) => void;
    };
  }
).__scheduleDebug;

debug?.bundle(import.meta.env.LEGACY ? "LEGACY" : "MODERN");
const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(
    rootElement,
    debug
      ? {
          onUncaughtError: (error, info) => {
            debug.report(
              "REACT",
              error instanceof Error ? error.message : String(error),
              "React root (see stack)",
              0,
              0,
              (error instanceof Error ? error.stack || "" : "") + (info.componentStack || "")
            );
            console.error(error);
          }
        }
      : undefined
  ).render(<App />);
}
