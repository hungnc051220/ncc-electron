import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createScheduleDisplayConfigService,
  type EncryptionAdapter
} from "./schedule-display-config.service";

const temporaryDirectories: string[] = [];

const createTemporaryPath = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ncc-schedule-config-"));
  temporaryDirectories.push(directory);
  return path.join(directory, "schedule-display.json");
};

afterEach(() => {
  temporaryDirectories
    .splice(0)
    .forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

describe("schedule display encrypted configuration", () => {
  it("stores only encrypted content and decrypts it when needed", () => {
    const encryption: EncryptionAdapter = {
      isEncryptionAvailable: () => true,
      encryptString: vi.fn((value) => Buffer.from(`encrypted:${value}`)),
      decryptString: vi.fn((value) => value.toString().replace("encrypted:", ""))
    };
    const configPath = createTemporaryPath();
    const service = createScheduleDisplayConfigService({ configPath, encryption });

    service.setApiKey("  private-key  ");

    expect(service.getApiKey()).toBe("private-key");
    expect(service.hasApiKey()).toBe(true);
    expect(fs.readFileSync(configPath, "utf-8")).not.toContain("private-key");

    service.setApiKey("replacement-key");
    expect(service.getApiKey()).toBe("replacement-key");
    expect(fs.readFileSync(configPath, "utf-8")).not.toContain("replacement-key");
  });

  it("does not report a configured key when encryption is unavailable", () => {
    const encryption: EncryptionAdapter = {
      isEncryptionAvailable: () => false,
      encryptString: vi.fn(),
      decryptString: vi.fn()
    };
    const service = createScheduleDisplayConfigService({
      configPath: createTemporaryPath(),
      encryption
    });

    expect(service.getApiKey()).toBeUndefined();
    expect(service.hasApiKey()).toBe(false);
    expect(() => service.setApiKey("private-key")).toThrow("chưa hỗ trợ mã hóa an toàn");
  });
});
