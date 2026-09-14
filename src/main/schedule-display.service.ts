import type {
  ScheduleDisplayConfigStatus,
  ScheduleDisplayConnectionResult,
  ScheduleDisplayPayload
} from "@shared/types";
import { SCHEDULE_DISPLAY_TIMEZONE } from "@shared/types";
import fs from "fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "http";
import net from "net";
import { networkInterfaces, type NetworkInterfaceInfo } from "os";
import path from "path";
import { getScheduleContentSecurityPolicy } from "./schedule-display-csp";
import {
  formatScheduleServerTime,
  getScheduleDate,
  normalizeScheduleDisplayData,
  type NormalizedScheduleDisplayData
} from "./schedule-display-data";

const DEFAULT_PORT = 17890;
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_CACHE_TTL_MS = 60_000;
const SCHEDULE_API_URL = "https://api.chieuphimquocgia.com.vn/api/GetAllSession";
const ASSET_ROUTE_PREFIX = "/schedule/assets/";
const VIRTUAL_INTERFACE_PATTERN =
  /(docker|hyper-v|vethernet|virtualbox|vmware|wsl|vpn|tailscale|zerotier|loopback)/i;
const CONTENT_SECURITY_POLICY = getScheduleContentSecurityPolicy();

type FetchFunction = typeof fetch;

interface ScheduleDisplayLogger {
  error: (event: string, details: { message: string; code?: string; status?: number }) => void;
}

interface ScheduleDisplayServiceOptions {
  rendererRoot: string;
  getSecret: () => string | undefined;
  port?: number;
  host?: string;
  cacheTtlMs?: number;
  fetchFn?: FetchFunction;
  now?: () => Date;
  getNetworkInterfaces?: typeof networkInterfaces;
  logger?: ScheduleDisplayLogger;
}

interface CachedSchedule extends NormalizedScheduleDisplayData {
  fetchedAt: string;
  lastSuccessAt: string;
}

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

const defaultLogger: ScheduleDisplayLogger = {
  error: (event, details) => console.error(`[schedule-display] ${event}`, details)
};

const redact = (value: string, secret?: string) =>
  secret ? value.replaceAll(secret, "[REDACTED]") : value;

const getSafeError = (error: unknown, secret?: string) => {
  const source = error && typeof error === "object" ? error : undefined;
  const message = redact(
    error instanceof Error ? error.message : "Không thể tải lịch chiếu",
    secret
  );
  const code = source && "code" in source ? redact(String(source.code), secret) : undefined;
  return { message, code };
};

const setSecurityHeaders = (response: ServerResponse) => {
  response.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
};

const writeJson = (
  response: ServerResponse,
  statusCode: number,
  body: unknown,
  headOnly = false
) => {
  const content = JSON.stringify(body);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(content)
  });
  response.end(headOnly ? undefined : content);
};

const isPrivateIpv4 = (address: string) => {
  if (net.isIP(address) !== 4) return false;
  const [first, second] = address.split(".").map(Number);
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
};

export const getScheduleDisplayUrls = (
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>,
  port: number
) => {
  const addresses = Object.entries(interfaces)
    .flatMap(([interfaceName, items]) => (items ?? []).map((item) => ({ interfaceName, ...item })))
    .filter((item) => !item.internal && item.family === "IPv4" && isPrivateIpv4(item.address))
    .sort((left, right) => {
      const leftVirtual = VIRTUAL_INTERFACE_PATTERN.test(left.interfaceName) ? 1 : 0;
      const rightVirtual = VIRTUAL_INTERFACE_PATTERN.test(right.interfaceName) ? 1 : 0;
      return leftVirtual - rightVirtual || left.interfaceName.localeCompare(right.interfaceName);
    });

  return [...new Set(addresses.map((item) => item.address))].map(
    (address) => `http://${address}:${port}/schedule`
  );
};

export function createScheduleDisplayService({
  rendererRoot,
  getSecret,
  port = DEFAULT_PORT,
  host = DEFAULT_HOST,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  fetchFn = fetch,
  now = () => new Date(),
  getNetworkInterfaces = networkInterfaces,
  logger = defaultLogger
}: ScheduleDisplayServiceOptions) {
  let server: Server | null = null;
  let running = false;
  let serverError: string | undefined;
  let cache: CachedSchedule | null = null;
  let cacheAt = 0;
  let cacheStale = false;
  let inFlight: Promise<CachedSchedule> | null = null;
  let listeningPort = port;

  const getStatus = (): ScheduleDisplayConfigStatus => ({
    configured: Boolean(getSecret()),
    server: {
      running,
      port: listeningPort,
      ...(serverError ? { error: serverError } : {})
    },
    urls: getScheduleDisplayUrls(getNetworkInterfaces(), listeningPort)
  });

  const requestUpstream = async (secret: string): Promise<NormalizedScheduleDisplayData> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetchFn(SCHEDULE_API_URL, {
        headers: {
          "secret-key": secret,
          platform: "web"
        },
        signal: controller.signal
      });

      if (!response.ok) {
        const error = new Error(`API lịch chiếu phản hồi HTTP ${response.status}`);
        Object.assign(error, { status: response.status });
        throw error;
      }

      return normalizeScheduleDisplayData(await response.json(), now());
    } finally {
      clearTimeout(timeout);
    }
  };

  const refreshCache = (secret: string) =>
    requestUpstream(secret).then((data) => {
      const successTime = now();
      const successAt = formatScheduleServerTime(successTime);
      cache = { ...data, fetchedAt: successAt, lastSuccessAt: successAt };
      cacheAt = successTime.getTime();
      cacheStale = false;
      return cache;
    });

  const toPayload = (source: CachedSchedule, stale: boolean): ScheduleDisplayPayload => ({
    date: source.date,
    timezone: SCHEDULE_DISPLAY_TIMEZONE,
    serverNow: formatScheduleServerTime(now()),
    fetchedAt: source.fetchedAt,
    lastSuccessAt: source.lastSuccessAt,
    stale,
    movies: source.movies
  });

  const getSchedulePayload = async (): Promise<ScheduleDisplayPayload> => {
    const requestTime = now();
    const currentDate = getScheduleDate(requestTime);
    if (cache && cache.date === currentDate && requestTime.getTime() - cacheAt < cacheTtlMs) {
      return toPayload(cache, cacheStale);
    }

    const secret = getSecret();
    if (!secret) throw new Error("Chưa cấu hình khóa API cho màn hình TV");

    if (!inFlight) {
      inFlight = refreshCache(secret).finally(() => {
        inFlight = null;
      });
    }

    try {
      return toPayload(await inFlight, false);
    } catch (error) {
      const safeError = getSafeError(error, secret);
      const status =
        error && typeof error === "object" && "status" in error ? Number(error.status) : undefined;
      logger.error("upstream request failed", { ...safeError, status });
      if (cache && cache.date === currentDate) {
        cacheAt = now().getTime();
        cacheStale = true;
        return toPayload(cache, true);
      }
      throw new Error(safeError.message);
    }
  };

  const testConnection = async (
    candidateSecret?: string
  ): Promise<ScheduleDisplayConnectionResult> => {
    const secret = candidateSecret?.trim() || getSecret();
    if (!secret) return { success: false, message: "Chưa nhập khóa API" };

    try {
      const data = await requestUpstream(secret);
      return {
        success: true,
        message: `Kết nối thành công, tìm thấy ${data.movies.length} phim hôm nay`,
        movieCount: data.movies.length
      };
    } catch (error) {
      const safeError = getSafeError(error, secret);
      const status =
        error && typeof error === "object" && "status" in error ? Number(error.status) : undefined;
      logger.error("connection test failed", { ...safeError, status });
      return { success: false, message: safeError.message };
    }
  };

  const serveFile = async (
    filePath: string,
    contentType: string,
    response: ServerResponse,
    headOnly: boolean,
    cacheControl: string
  ) => {
    try {
      if (contentType.startsWith("text/html")) {
        const html = await fs.promises.readFile(filePath, "utf8");
        response.writeHead(200, {
          "Content-Security-Policy": getScheduleContentSecurityPolicy(html),
          "Content-Type": contentType,
          "Cache-Control": cacheControl,
          "Content-Length": Buffer.byteLength(html)
        });
        response.end(headOnly ? undefined : html);
        return;
      }

      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile()) throw new Error("Not a file");

      response.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
        "Content-Length": stat.size
      });

      if (headOnly) {
        response.end();
        return;
      }

      fs.createReadStream(filePath)
        .on("error", () => response.destroy())
        .pipe(response);
    } catch {
      writeJson(response, 404, { message: "Không tìm thấy nội dung" }, headOnly);
    }
  };

  const serveAsset = async (pathname: string, response: ServerResponse, headOnly: boolean) => {
    const relativePath = pathname.slice(ASSET_ROUTE_PREFIX.length);
    const extension = path.extname(relativePath).toLowerCase();
    if (!relativePath || !contentTypes[extension]) {
      writeJson(response, 404, { message: "Không tìm thấy nội dung" }, headOnly);
      return;
    }

    const assetRoot = path.resolve(rendererRoot, "assets");
    const assetPath = path.resolve(assetRoot, relativePath);
    const pathFromRoot = path.relative(assetRoot, assetPath);
    if (pathFromRoot.startsWith("..") || path.isAbsolute(pathFromRoot)) {
      writeJson(response, 404, { message: "Không tìm thấy nội dung" }, headOnly);
      return;
    }

    await serveFile(
      assetPath,
      contentTypes[extension],
      response,
      headOnly,
      "public, max-age=31536000, immutable"
    );
  };

  const handleRequest = async (request: IncomingMessage, response: ServerResponse) => {
    setSecurityHeaders(response);
    const method = request.method ?? "GET";
    const headOnly = method === "HEAD";
    if (method !== "GET" && !headOnly) {
      response.setHeader("Allow", "GET, HEAD");
      writeJson(response, 405, { message: "Phương thức không được hỗ trợ" });
      return;
    }

    let pathname: string;
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost");
      pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
      writeJson(response, 404, { message: "Không tìm thấy nội dung" }, headOnly);
      return;
    }

    if (pathname === "/schedule/api") {
      try {
        writeJson(response, 200, await getSchedulePayload(), headOnly);
      } catch (error) {
        const message = getSafeError(error).message;
        writeJson(response, message.includes("Chưa cấu hình") ? 503 : 502, { message }, headOnly);
      }
      return;
    }

    if (pathname === "/schedule" || pathname === "/schedule/") {
      await serveFile(
        path.resolve(rendererRoot, "schedule.html"),
        "text/html; charset=utf-8",
        response,
        headOnly,
        "no-store"
      );
      return;
    }

    if (pathname.startsWith(ASSET_ROUTE_PREFIX)) {
      await serveAsset(pathname, response, headOnly);
      return;
    }

    writeJson(response, 404, { message: "Không tìm thấy nội dung" }, headOnly);
  };

  const start = async () => {
    if (server) return getStatus();

    serverError = undefined;
    server = createServer(handleRequest);

    await new Promise<void>((resolve) => {
      const activeServer = server!;
      const onError = (error: NodeJS.ErrnoException) => {
        const safeError = getSafeError(error);
        serverError =
          error.code === "EADDRINUSE"
            ? `Cổng ${port} đang được ứng dụng khác sử dụng`
            : safeError.message;
        running = false;
        server = null;
        logger.error("server failed to start", safeError);
        resolve();
      };

      activeServer.once("error", onError);
      activeServer.listen(port, host, () => {
        activeServer.removeListener("error", onError);
        activeServer.on("error", (error) => {
          const safeError = getSafeError(error);
          serverError = safeError.message;
          running = false;
          logger.error("server error", safeError);
        });
        const address = activeServer.address();
        listeningPort = typeof address === "object" && address ? address.port : port;
        running = true;
        resolve();
      });
    });

    return getStatus();
  };

  const stop = async () => {
    const activeServer = server;
    server = null;
    if (!activeServer) {
      running = false;
      return;
    }

    await new Promise<void>((resolve) => activeServer.close(() => resolve()));
    running = false;
  };

  return { getStatus, getSchedulePayload, start, stop, testConnection };
}

export type ScheduleDisplayService = ReturnType<typeof createScheduleDisplayService>;
