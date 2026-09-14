import fs from "fs";
import { createHash } from "crypto";
import type { IncomingHttpHeaders } from "http";
import net from "net";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createScheduleDisplayService, getScheduleDisplayUrls } from "./schedule-display.service";

const temporaryDirectories: string[] = [];
const activeServices: Array<ReturnType<typeof createScheduleDisplayService>> = [];

const scheduleResponse = {
  listday: [
    {
      Day: "10-9-2026",
      lstFilm: [
        {
          Id: 1,
          FilmName: "Phim thử nghiệm",
          lstSession: [{ Id: 10, ProjectTime: "2026-09-10T10:00:00" }]
        }
      ]
    }
  ]
};

const createRendererRoot = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ncc-schedule-server-"));
  temporaryDirectories.push(directory);
  fs.mkdirSync(path.join(directory, "assets"));
  fs.writeFileSync(path.join(directory, "schedule.html"), "<html>schedule</html>");
  fs.writeFileSync(path.join(directory, "index.html"), "<html>admin</html>");
  fs.writeFileSync(path.join(directory, "assets", "app.js"), "console.log('schedule')");
  return directory;
};

const request = (port: number, pathname: string, method = "GET") =>
  new Promise<{ status: number; headers: IncomingHttpHeaders; body: string }>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const socket = net.createConnection({ host: "127.0.0.1", port }, () => {
      socket.write(
        `${method} ${pathname} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`
      );
    });

    socket.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    socket.on("error", reject);
    socket.on("end", () => {
      const rawResponse = Buffer.concat(chunks).toString("utf-8");
      const separatorIndex = rawResponse.indexOf("\r\n\r\n");
      const headerText = rawResponse.slice(0, separatorIndex);
      const body = rawResponse.slice(separatorIndex + 4);
      const lines = headerText.split("\r\n");
      const status = Number(lines.shift()?.split(" ")[1] ?? 0);
      const headers = Object.fromEntries(
        lines.map((line) => {
          const colonIndex = line.indexOf(":");
          return [line.slice(0, colonIndex).toLowerCase(), line.slice(colonIndex + 1).trim()];
        })
      );
      resolve({ status, headers, body });
    });
  });

const createService = (
  overrides: Partial<Parameters<typeof createScheduleDisplayService>[0]> = {}
) => {
  const service = createScheduleDisplayService({
    rendererRoot: createRendererRoot(),
    getSecret: () => "private-key",
    host: "127.0.0.1",
    port: 0,
    now: () => new Date("2026-09-10T03:00:00.000Z"),
    getNetworkInterfaces: () => ({
      Ethernet: [
        {
          address: "192.168.74.100",
          netmask: "255.255.255.0",
          family: "IPv4",
          mac: "00:00:00:00:00:00",
          internal: false,
          cidr: "192.168.74.100/24"
        }
      ]
    }),
    fetchFn: vi.fn().mockResolvedValue(Response.json(scheduleResponse)),
    logger: { error: vi.fn() },
    ...overrides
  });
  activeServices.push(service);
  return service;
};

afterEach(async () => {
  await Promise.all(activeServices.splice(0).map((service) => service.stop()));
  temporaryDirectories
    .splice(0)
    .forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

describe("schedule display HTTP service", () => {
  it("allows only exact local inline script hashes for diagnostics and the legacy loader", async () => {
    const rendererRoot = createRendererRoot();
    const source = "window.basic = true;\n";
    const loader = "System.import('app.js')";
    fs.writeFileSync(
      path.join(rendererRoot, "schedule.html"),
      `<html><script>${source.replace(/\n/g, "\r\n")}</script>` +
        `<script data-src="app.js">${loader}</script><script src="external.js"></script></html>`
    );
    const service = createService({ rendererRoot });
    await service.start();
    const response = await request(service.getStatus().server.port, "/schedule?debug=1");
    const csp = String(response.headers["content-security-policy"]);
    const scriptPolicy = csp.split(";").find((part) => part.trim().startsWith("script-src"))!;
    for (const body of [source, loader]) {
      expect(scriptPolicy).toContain(
        `'sha256-${createHash("sha256").update(body).digest("base64")}'`
      );
    }
    expect(scriptPolicy).not.toContain("unsafe-inline");
    expect(scriptPolicy).not.toContain("unsafe-eval");
    expect(scriptPolicy.match(/sha256-/g)).toHaveLength(2);
    const head = await request(service.getStatus().server.port, "/schedule", "HEAD");
    expect(head.headers["content-security-policy"]).toBe(csp);
    expect(head.body).toBe("");
  });

  it("serves only the TV page and isolated assets with security headers", async () => {
    const service = createService();
    await service.start();
    const status = service.getStatus();
    const page = await request(status.server.port, "/schedule");

    expect(status).toEqual({
      configured: true,
      server: { running: true, port: status.server.port },
      urls: [`http://192.168.74.100:${status.server.port}/schedule`]
    });
    expect(page).toMatchObject({ status: 200, body: "<html>schedule</html>" });
    expect(page.headers["x-content-type-options"]).toBe("nosniff");
    expect(page.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(await request(status.server.port, "/schedule/assets/app.js")).toMatchObject({
      status: 200,
      body: "console.log('schedule')"
    });
    expect((await request(status.server.port, "/")).status).toBe(404);
    expect((await request(status.server.port, "/assets/app.js")).status).toBe(404);
    expect((await request(status.server.port, "/index.html")).status).toBe(404);
  });

  it("proxies a small DTO without exposing its API key or upstream endpoint", async () => {
    const fetchFn = vi.fn().mockResolvedValue(Response.json(scheduleResponse));
    const service = createService({ fetchFn });
    await service.start();
    const response = await request(service.getStatus().server.port, "/schedule/api");
    const payload = JSON.parse(response.body);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      date: "2026-09-10",
      timezone: "Asia/Ho_Chi_Minh",
      serverNow: "2026-09-10T10:00:00+07:00",
      stale: false,
      movies: [{ title: "Phim thử nghiệm" }]
    });
    expect(payload.movies[0]).not.toHaveProperty("RoomId");
    expect(response.body).not.toContain("private-key");
    expect(response.body).not.toContain("GetAllSession");
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.chieuphimquocgia.com.vn/api/GetAllSession",
      expect.objectContaining({ headers: { "secret-key": "private-key", platform: "web" } })
    );
  });

  it("uses one in-flight request and reuses the fresh cache", async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    const fetchFn = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );
    const service = createService({ fetchFn });

    const requests = [
      service.getSchedulePayload(),
      service.getSchedulePayload(),
      service.getSchedulePayload()
    ];
    expect(fetchFn).toHaveBeenCalledTimes(1);
    resolveFetch?.(Response.json(scheduleResponse));
    const results = await Promise.all(requests);
    expect(results.every((result) => result.movies.length === 1)).toBe(true);

    await service.getSchedulePayload();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("refreshes an expired cache and recovers from stale data", async () => {
    let currentTime = new Date("2026-09-10T03:00:00.000Z").getTime();
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(Response.json(scheduleResponse))
      .mockRejectedValueOnce(new Error("upstream offline"))
      .mockResolvedValueOnce(Response.json(scheduleResponse));
    const service = createService({
      fetchFn,
      now: () => new Date(currentTime),
      cacheTtlMs: 60_000
    });

    expect((await service.getSchedulePayload()).stale).toBe(false);
    currentTime += 30_000;
    expect((await service.getSchedulePayload()).stale).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    currentTime += 31_000;
    const stale = await service.getSchedulePayload();
    expect(stale.stale).toBe(true);
    expect(stale.lastSuccessAt).toBe("2026-09-10T10:00:00+07:00");
    expect((await service.getSchedulePayload()).stale).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    currentTime += 60_001;
    expect((await service.getSchedulePayload()).stale).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("does not cache a candidate key and returns an error without an existing cache", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(Response.json(scheduleResponse))
      .mockRejectedValueOnce(new Error("saved key rejected"));
    const service = createService({ fetchFn });

    expect((await service.testConnection("candidate-key")).success).toBe(true);
    await expect(service.getSchedulePayload()).rejects.toThrow("saved key rejected");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("never includes the API key in an upstream error log", async () => {
    const logger = { error: vi.fn() };
    const upstreamError = Object.assign(new Error("request failed for private-key"), {
      code: "AUTH_private-key"
    });
    const service = createService({
      fetchFn: vi.fn().mockRejectedValue(upstreamError),
      logger
    });

    await expect(service.getSchedulePayload()).rejects.toThrow("[REDACTED]");
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain("private-key");
  });

  it("rejects unsupported methods, raw traversal and encoded traversal", async () => {
    const service = createService();
    await service.start();
    const port = service.getStatus().server.port;

    expect((await request(port, "/schedule", "POST")).status).toBe(405);
    expect((await request(port, "/schedule", "HEAD")).body).toBe("");
    expect((await request(port, "/schedule/assets/../schedule.html")).status).toBe(404);
    expect((await request(port, "/schedule/assets/%2e%2e%2fschedule.html")).status).toBe(404);
    expect((await request(port, "/schedule/assets/%5c..%5cschedule.html")).status).toBe(404);
  });

  it("returns 503 when the key has not been configured", async () => {
    const service = createService({ getSecret: () => undefined });
    await service.start();

    expect((await request(service.getStatus().server.port, "/schedule/api")).status).toBe(503);
  });

  it("reports a server error when the configured port is already occupied", async () => {
    const firstService = createService();
    await firstService.start();
    const occupiedPort = firstService.getStatus().server.port;
    const secondService = createService({ port: occupiedPort });

    const status = await secondService.start();
    expect(status.server).toMatchObject({
      running: false,
      port: occupiedPort,
      error: `Cổng ${occupiedPort} đang được ứng dụng khác sử dụng`
    });
  });
});

describe("schedule display LAN URLs", () => {
  it("keeps private IPv4 addresses and recommends a physical adapter first", () => {
    const interfaceInfo = (address: string, internal = false) => ({
      address,
      netmask: "255.255.255.0",
      family: "IPv4" as const,
      mac: "00:00:00:00:00:00",
      internal,
      cidr: `${address}/24`
    });
    const urls = getScheduleDisplayUrls(
      {
        "vEthernet (WSL)": [interfaceInfo("172.20.0.1")],
        Ethernet: [interfaceInfo("192.168.74.100")],
        Public: [interfaceInfo("8.8.8.8")],
        Loopback: [interfaceInfo("127.0.0.1", true)]
      },
      17890
    );

    expect(urls).toEqual([
      "http://192.168.74.100:17890/schedule",
      "http://172.20.0.1:17890/schedule"
    ]);
  });
});
