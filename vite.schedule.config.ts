import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(__dirname, "src/renderer"),
  base: "/schedule/",
  publicDir: false,
  plugins: [react()],
  resolve: {
    alias: {
      "@renderer": resolve(__dirname, "src/renderer/src"),
      "@shared": resolve(__dirname, "src/shared")
    }
  },
  build: {
    outDir: resolve(__dirname, "out/schedule"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "src/renderer/schedule.html")
    }
  }
});
