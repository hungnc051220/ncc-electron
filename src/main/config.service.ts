// config.service.ts
import { AppConfig } from "@shared/types";
import { app } from "electron";
import fs from "fs";
import path from "path";

const configPath = path.join(app.getPath("userData"), "config.json");

const defaultConfig: AppConfig = {
  apiBaseUrl: "https://testapiv3.chieuphimquocgia.com.vn",
  socketUrl: "wss://testapiv3.chieuphimquocgia.com.vn",
  theme: "light"
};

function toSocketUrl(apiUrl: string): string {
  if (apiUrl.startsWith("https")) {
    return apiUrl.replace("https", "wss");
  }
  return apiUrl.replace("http", "ws");
}

export function getConfig(): AppConfig {
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw);

  // 🔥 merge default + file cũ
  const merged: AppConfig = {
    ...defaultConfig,
    ...parsed
  };

  if (!merged.socketUrl) {
    merged.socketUrl = toSocketUrl(merged.apiBaseUrl);
  }

  // Ghi lại nếu thiếu field
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));

  return merged;
}

export function setConfig(newConfig: AppConfig) {
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
}
