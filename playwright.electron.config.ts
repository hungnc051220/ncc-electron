import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/electron",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 300000,
  expect: {
    timeout: 15000
  },
  use: {
    trace: "retain-on-failure"
  }
});
