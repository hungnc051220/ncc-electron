import { resolve } from "path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const buildDefines = {
  "process.env.APP_RELEASE_CHANNEL": JSON.stringify(process.env.APP_RELEASE_CHANNEL ?? "latest"),
  "process.env.APP_ENABLE_DEVTOOLS": JSON.stringify(process.env.APP_ENABLE_DEVTOOLS ?? "false")
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
