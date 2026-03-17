import { resolve } from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@renderer": resolve(__dirname, "src/renderer/src"),
      "@shared": resolve(__dirname, "src/shared")
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/renderer/src/test/setup.ts"],
    css: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/out/**",
      "**/e2e/**",
      "playwright.config.ts",
      "vite.playwright.config.ts"
    ],
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/renderer/src/**/*.{ts,tsx}", "src/preload/**/*.ts", "src/main/**/*.ts"]
    }
  }
});
