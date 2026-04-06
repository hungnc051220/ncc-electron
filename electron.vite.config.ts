import { resolve } from "path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const buildDefines = {
  "process.env.APP_RELEASE_CHANNEL": JSON.stringify(process.env.APP_RELEASE_CHANNEL ?? "latest"),
  "process.env.APP_ENABLE_DEVTOOLS": JSON.stringify(process.env.APP_ENABLE_DEVTOOLS ?? "false"),
  "process.env.APP_MOCK_UPDATE": JSON.stringify(process.env.APP_MOCK_UPDATE ?? "false"),
  "process.env.APP_MOCK_UPDATE_PROGRESS": JSON.stringify(
    process.env.APP_MOCK_UPDATE_PROGRESS ?? "false"
  ),
  "process.env.APP_MOCK_UPDATE_VERSION": JSON.stringify(process.env.APP_MOCK_UPDATE_VERSION ?? ""),
  "process.env.APP_MOCK_UPDATE_PROGRESS_STEP_MS": JSON.stringify(
    process.env.APP_MOCK_UPDATE_PROGRESS_STEP_MS ?? "550"
  ),
  "process.env.APP_MOCK_UPDATE_PROGRESS_HOLD_AT": JSON.stringify(
    process.env.APP_MOCK_UPDATE_PROGRESS_HOLD_AT ?? ""
  )
};

export default defineConfig({
  main: {
    define: buildDefines,
    resolve: {
      alias: {
        "@shared": resolve("src/shared")
      }
    }
  },
  preload: {
    define: buildDefines,
    resolve: {
      alias: {
        "@shared": resolve("src/shared")
      }
    }
  },
  renderer: {
    define: buildDefines,
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        "@shared": resolve("src/shared")
      }
    },
    plugins: [react(), tailwindcss()]
  }
});
