import { ElectronAPI } from "@electron-toolkit/preload";
import type { PreloadAPI } from "./api.types";

declare global {
  interface Window {
    electron: ElectronAPI;
    api: PreloadAPI;
  }
}
