import { EventEmitter } from "events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (...args: unknown[]) => unknown;

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, Handler>(),
  appVersion: "1.0.120",
  updater: null as unknown as EventEmitter & {
    checkForUpdates: ReturnType<typeof vi.fn>;
    downloadUpdate: ReturnType<typeof vi.fn>;
    quitAndInstall: ReturnType<typeof vi.fn>;
    autoInstallOnAppQuit: boolean;
    allowDowngrade?: boolean;
    channel?: string;
    allowPrerelease?: boolean;
    autoDownload?: boolean;
  },
  appendLog: null as unknown as ReturnType<typeof vi.fn>
}));

vi.mock("electron", () => ({
  app: {
    isPackaged: true,
    getVersion: () => mocks.appVersion,
    getPath: () => "C:/logs"
  },
  BrowserWindow: class {},
  ipcMain: {
    handle: (channel: string, handler: Handler) => mocks.handlers.set(channel, handler)
  }
}));

vi.mock("electron-updater", () => ({
  get autoUpdater() {
    return mocks.updater;
  }
}));

vi.mock("./update-error", async (importOriginal) => {
  const original = await importOriginal<typeof import("./update-error")>();
  return {
    ...original,
    appendUpdateErrorLog: (...args: unknown[]) => mocks.appendLog(...args)
  };
});

const createPolicy = (overrides: Record<string, unknown> = {}) => ({
  enabled: true,
  latestVersion: "1.0.122",
  minSupportedVersion: "1.0.91",
  mode: "optional",
  messages: ["Giá vé U22 theo ngày"],
  ...overrides
});

const mockPolicyResponse = (policy: unknown) =>
  vi.fn(async () => ({ ok: true, status: 200, json: async () => policy }));

const flush = async () => {
  for (let i = 0; i < 5; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

const createWindow = () => {
  const send = vi.fn();
  return {
    win: {
      isDestroyed: () => false,
      webContents: { isDestroyed: () => false, send }
    },
    send
  };
};

const getSentErrors = (send: ReturnType<typeof vi.fn>) =>
  send.mock.calls.filter(([channel]) => channel === "update:error").map(([, payload]) => payload);

const setupUpdaterUnderTest = async (
  options: { onInstallUpdateStateChange?: (value: boolean) => void } = {}
) => {
  const { setupUpdater } = await import("./updater.service");
  const { win, send } = createWindow();
  setupUpdater(win as never, options);
  await flush();
  return {
    send,
    invoke: (channel: string, ...args: unknown[]) => mocks.handlers.get(channel)?.({}, ...args)
  };
};

const failWithUpdaterError = (message: string) => async () => {
  const error = new Error(message);
  mocks.updater.emit("error", error, `Cannot check for updates: ${error.stack}`);
  throw error;
};

describe("setupUpdater", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.handlers.clear();
    mocks.appVersion = "1.0.120";
    mocks.appendLog = vi.fn(async () => undefined);
    mocks.updater = Object.assign(new EventEmitter(), {
      checkForUpdates: vi.fn(async () => ({ updateInfo: { version: "1.0.122" } })),
      downloadUpdate: vi.fn(async () => []),
      quitAndInstall: vi.fn(),
      autoInstallOnAppQuit: true
    });
    // Như electron-updater (AppUpdater.channel setter): gán channel thì tự bật allowDowngrade.
    let channel: string | undefined;
    Object.defineProperty(mocks.updater, "channel", {
      configurable: true,
      get: () => channel,
      set: (value: string) => {
        channel = value;
        mocks.updater.allowDowngrade = true;
      }
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("when the policy is paused (enabled=false)", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", mockPolicyResponse(createPolicy({ enabled: false })));
    });

    it("does not check for updates on startup and disables install-on-quit", async () => {
      const { send } = await setupUpdaterUnderTest();

      expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled();
      expect(mocks.updater.autoInstallOnAppQuit).toBe(false);
      expect(send).not.toHaveBeenCalledWith("update:available", expect.anything());
      expect(getSentErrors(send)).toEqual([]);
      // Policy hợp lệ enabled=false không phải lỗi: không ghi log fail-closed.
      expect(mocks.appendLog).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });

    it("returns disabled for a manual check and never starts a download", async () => {
      const { invoke } = await setupUpdaterUnderTest();

      const actualResult = await invoke("app:check-update");
      await invoke("app:start-download");
      await flush();

      expect(actualResult).toEqual({ status: "disabled" });
      expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled();
      expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled();
    });
  });

  it("does not allow downgrades for machines already on 1.0.122", async () => {
    mocks.appVersion = "1.0.122";
    vi.stubGlobal("fetch", mockPolicyResponse(createPolicy({ latestVersion: "1.0.120" })));

    await setupUpdaterUnderTest();

    expect(mocks.updater.channel).toBe("latest");
    expect(mocks.updater.allowDowngrade).toBe(false);
  });

  it("sends the mode resolved for this machine, not the raw policy mode, with an update", async () => {
    // Policy đang ép 1.0.123; máy đã ở 1.0.123 nên bản 1.0.124 chỉ là cập nhật tùy chọn.
    mocks.appVersion = "1.0.123";
    vi.stubGlobal(
      "fetch",
      mockPolicyResponse(
        createPolicy({ mode: "force", latestVersion: "1.0.123", minSupportedVersion: "1.0.123" })
      )
    );
    const { send } = await setupUpdaterUnderTest();

    mocks.updater.emit("update-available", { version: "1.0.124" });
    mocks.updater.emit("update-downloaded", { version: "1.0.124" });

    const actualAvailable = send.mock.calls.find(
      ([channel]) => channel === "update:available"
    )?.[1];
    const actualReady = send.mock.calls.find(([channel]) => channel === "update:ready")?.[1];
    expect(actualAvailable).toMatchObject({
      version: "1.0.124",
      mode: "optional",
      policy: { mode: "optional", minSupportedVersion: "1.0.123" }
    });
    expect(actualReady).toMatchObject({ mode: "optional", policy: { mode: "optional" } });
  });

  it("keeps force for machines below minSupportedVersion", async () => {
    mocks.appVersion = "1.0.122";
    vi.stubGlobal(
      "fetch",
      mockPolicyResponse(
        createPolicy({ mode: "force", latestVersion: "1.0.123", minSupportedVersion: "1.0.123" })
      )
    );
    const { send } = await setupUpdaterUnderTest();

    mocks.updater.emit("update-available", { version: "1.0.124" });

    const actualAvailable = send.mock.calls.find(
      ([channel]) => channel === "update:available"
    )?.[1];
    expect(actualAvailable).toMatchObject({ mode: "force", policy: { mode: "force" } });
  });

  describe("fail-closed when the policy cannot be fetched or is invalid", () => {
    const networkError = async () => {
      throw new Error("getaddrinfo ENOTFOUND raw.githubusercontent.com");
    };
    const httpError = async () => ({ ok: false, status: 404, json: async () => ({}) });
    const invalidJson = async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON");
      }
    });

    const failureCases = [
      {
        name: "fetch error (network)",
        mockFetch: () => vi.fn(networkError),
        expectedCode: "UPDATE_NETWORK"
      },
      { name: "HTTP 404", mockFetch: () => vi.fn(httpError), expectedCode: "UPDATE_UNKNOWN" },
      { name: "invalid JSON", mockFetch: () => vi.fn(invalidJson), expectedCode: "UPDATE_UNKNOWN" },
      {
        name: "JSON null",
        mockFetch: () => mockPolicyResponse(null),
        expectedCode: "UPDATE_UNKNOWN"
      },
      {
        name: "JSON array",
        mockFetch: () => mockPolicyResponse([]),
        expectedCode: "UPDATE_UNKNOWN"
      },
      {
        name: "object without enabled",
        mockFetch: () => mockPolicyResponse({ latestVersion: "1.0.123", mode: "force" }),
        expectedCode: "UPDATE_UNKNOWN"
      },
      {
        name: "enabled as a string",
        mockFetch: () => mockPolicyResponse(createPolicy({ enabled: "true" })),
        expectedCode: "UPDATE_UNKNOWN"
      }
    ];

    it.each(failureCases)(
      "$name: logs it, never checks on startup and disables install-on-quit",
      async ({ mockFetch, expectedCode }) => {
        vi.stubGlobal("fetch", mockFetch());

        const { send } = await setupUpdaterUnderTest();

        expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled();
        expect(mocks.updater.autoInstallOnAppQuit).toBe(false);
        expect(send).toHaveBeenCalledWith(
          "update:policy",
          expect.objectContaining({ enabled: false, mode: "optional" })
        );
        expect(send).not.toHaveBeenCalledWith("update:available", expect.anything());
        expect(getSentErrors(send)).toEqual([]);
        expect(mocks.appendLog).toHaveBeenCalledWith(
          expect.stringContaining("updater.log"),
          expect.objectContaining({ source: "policy-fetch", code: expectedCode })
        );
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("fail-closed"));
      }
    );

    it.each(failureCases)(
      "$name: a manual check returns disabled and never downloads",
      async ({ mockFetch }) => {
        vi.stubGlobal("fetch", mockFetch());
        const { invoke } = await setupUpdaterUnderTest();

        const actualResult = await invoke("app:check-update");
        await invoke("app:start-download");
        await flush();

        expect(actualResult).toEqual({ status: "disabled" });
        expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled();
        expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled();
      }
    );

    it("resumes normal checks once a valid enabled policy is fetched again", async () => {
      const fetchMock = vi
        .fn()
        .mockImplementationOnce(networkError)
        .mockImplementation(async () => ({
          ok: true,
          status: 200,
          json: async () => createPolicy()
        }));
      vi.stubGlobal("fetch", fetchMock);
      const { invoke } = await setupUpdaterUnderTest();
      expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled();

      const actualResult = await invoke("app:check-update");

      expect(actualResult).toMatchObject({ status: "checked", info: { version: "1.0.122" } });
      expect(mocks.updater.checkForUpdates).toHaveBeenCalledTimes(1);
      expect(mocks.updater.autoInstallOnAppQuit).toBe(true);
    });
  });

  describe("when the policy is enabled", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", mockPolicyResponse(createPolicy()));
    });

    it("checks once on startup, allows install-on-quit and lets the cashier download", async () => {
      const { invoke, send } = await setupUpdaterUnderTest();

      expect(mocks.updater.checkForUpdates).toHaveBeenCalledTimes(1);
      expect(mocks.updater.autoInstallOnAppQuit).toBe(true);
      expect(send).toHaveBeenCalledWith(
        "update:policy",
        expect.objectContaining({ enabled: true, latestVersion: "1.0.122" })
      );

      await invoke("app:start-download");
      await flush();

      expect(mocks.updater.downloadUpdate).toHaveBeenCalledTimes(1);
    });

    it("keeps a failed startup check silent for the cashier but logs it once", async () => {
      mocks.updater.checkForUpdates.mockImplementation(
        failWithUpdaterError("net::ERR_INTERNET_DISCONNECTED")
      );

      const { send } = await setupUpdaterUnderTest();

      expect(getSentErrors(send)).toEqual([]);
      expect(mocks.appendLog).toHaveBeenCalledTimes(1);
      expect(mocks.appendLog.mock.calls[0][1]).toMatchObject({
        code: "UPDATE_NETWORK",
        stage: "check",
        appVersion: "1.0.120"
      });
    });

    it("reports a failed manual check once, with a code instead of the raw error", async () => {
      const { invoke, send } = await setupUpdaterUnderTest();
      mocks.appendLog.mockClear();
      mocks.updater.checkForUpdates.mockImplementation(
        failWithUpdaterError(
          'HttpError: 404 "method: GET url: https://github.com/o/r/releases.atom"\nHeaders: {}'
        )
      );

      const actualResult = await invoke("app:check-update");

      const expectedPayload = { code: "UPDATE_UNKNOWN", stage: "check", retryable: true };
      expect(actualResult).toEqual({ status: "failed", error: expectedPayload });
      expect(getSentErrors(send)).toEqual([expectedPayload]);
      expect(mocks.appendLog).toHaveBeenCalledTimes(1);
    });

    it("reports a download failure once with the download stage", async () => {
      const { invoke, send } = await setupUpdaterUnderTest();
      mocks.updater.downloadUpdate.mockImplementation(async () => {
        const error = new Error("net::ERR_CONNECTION_RESET");
        mocks.updater.emit("error", error, error.stack);
        throw error;
      });

      await invoke("app:start-download");
      await flush();

      expect(getSentErrors(send)).toEqual([
        { code: "UPDATE_NETWORK", stage: "download", retryable: true }
      ]);
    });

    it("restores the normal quit flow when installing fails without throwing", async () => {
      const onInstallUpdateStateChange = vi.fn();
      const { invoke, send } = await setupUpdaterUnderTest({ onInstallUpdateStateChange });
      mocks.updater.quitAndInstall.mockImplementation(() => {
        mocks.updater.emit(
          "error",
          new Error("No update filepath provided, can't quit and install")
        );
      });

      await invoke("app:install-update", { isSilent: false });

      expect(onInstallUpdateStateChange.mock.calls).toEqual([[true], [false]]);
      expect(getSentErrors(send)).toEqual([
        { code: "UPDATE_INSTALL_FAILED", stage: "install", retryable: false }
      ]);
    });
  });
});
