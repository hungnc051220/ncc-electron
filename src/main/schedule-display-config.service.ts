import fs from "fs";
import path from "path";

export interface EncryptionAdapter {
  isEncryptionAvailable: () => boolean;
  encryptString: (value: string) => Buffer;
  decryptString: (value: Buffer) => string;
}

interface StoredScheduleDisplayConfig {
  encryptedSecret?: string;
}

interface ScheduleDisplayConfigServiceOptions {
  configPath: string;
  encryption: EncryptionAdapter;
  logger?: {
    error: (event: string, details: { message: string; code?: string }) => void;
  };
}

const defaultLogger = {
  error: (event: string, details: { message: string; code?: string }) =>
    console.error(`[schedule-display] ${event}`, details)
};

const getSafeError = (error: unknown) => {
  const source = error && typeof error === "object" ? error : undefined;
  return {
    message: error instanceof Error ? error.message : "Lỗi lưu trữ không xác định",
    code: source && "code" in source ? String(source.code) : undefined
  };
};

export function createScheduleDisplayConfigService({
  configPath,
  encryption,
  logger = defaultLogger
}: ScheduleDisplayConfigServiceOptions) {
  const readStoredConfig = (): StoredScheduleDisplayConfig => {
    if (!fs.existsSync(configPath)) return {};

    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      logger.error("cannot read encrypted configuration", getSafeError(error));
      return {};
    }
  };

  const getApiKey = () => {
    const encryptedSecret = readStoredConfig().encryptedSecret;
    if (!encryptedSecret || !encryption.isEncryptionAvailable()) return undefined;

    try {
      return encryption.decryptString(Buffer.from(encryptedSecret, "base64")).trim() || undefined;
    } catch (error) {
      logger.error("cannot decrypt API key", getSafeError(error));
      return undefined;
    }
  };

  const setApiKey = (apiKey: string) => {
    const normalizedApiKey = apiKey.trim();
    if (!normalizedApiKey) {
      throw new Error("Khóa API không được để trống");
    }

    if (!encryption.isEncryptionAvailable()) {
      throw new Error("Máy hiện tại chưa hỗ trợ mã hóa an toàn");
    }

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    const encryptedSecret = encryption.encryptString(normalizedApiKey).toString("base64");
    fs.writeFileSync(configPath, JSON.stringify({ encryptedSecret }, null, 2), "utf-8");
  };

  return {
    getApiKey,
    hasApiKey: () => Boolean(getApiKey()),
    setApiKey,
    isEncryptionAvailable: () => encryption.isEncryptionAvailable()
  };
}

export type ScheduleDisplayConfigService = ReturnType<typeof createScheduleDisplayConfigService>;
