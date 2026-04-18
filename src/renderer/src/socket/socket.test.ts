import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ioMock = vi.fn();

vi.mock("socket.io-client", () => ({
  io: (...args: unknown[]) => ioMock(...args)
}));

describe("socket", () => {
  beforeEach(() => {
    vi.resetModules();
    ioMock.mockReset();
  });

  afterEach(async () => {
    const socketModule = await import("./socket");
    socketModule.disconnectSocket();
  });

  it("reuses the same socket instance for the same token", async () => {
    const fakeSocket = {
      on: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn()
    };
    ioMock.mockReturnValue(fakeSocket);

    const socketModule = await import("./socket");
    socketModule.initSocket("https://ncc.local");

    const first = socketModule.connectSocket("token-1");
    const second = socketModule.connectSocket("token-1");

    expect(first).toBe(second);
    expect(ioMock).toHaveBeenCalledTimes(1);
  });

  it("disconnects the previous socket when token changes", async () => {
    const firstSocket = {
      on: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn()
    };
    const secondSocket = {
      on: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn()
    };
    ioMock.mockReturnValueOnce(firstSocket).mockReturnValueOnce(secondSocket);

    const socketModule = await import("./socket");
    socketModule.initSocket("https://ncc.local");

    socketModule.connectSocket("token-1");
    const nextSocket = socketModule.connectSocket("token-2");

    expect(firstSocket.disconnect).toHaveBeenCalledTimes(1);
    expect(nextSocket).toBe(secondSocket);
    expect(ioMock).toHaveBeenCalledTimes(2);
  });

  it("registers and cleans up payment listeners", async () => {
    const fakeSocket = {
      on: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn()
    };
    const callback = vi.fn();
    ioMock.mockReturnValue(fakeSocket);

    const socketModule = await import("./socket");
    socketModule.initSocket("https://ncc.local");
    socketModule.connectSocket("token-1");

    const cleanup = socketModule.onOrderPaymentUpdated(callback);

    expect(fakeSocket.on).toHaveBeenCalledWith("orderPaymentUpdated", callback);

    cleanup?.();

    expect(fakeSocket.off).toHaveBeenCalledWith("orderPaymentUpdated", callback);
  });

  it("rebinds managed listeners when the socket instance is recreated", async () => {
    const firstSocket = {
      on: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn()
    };
    const secondSocket = {
      on: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn()
    };
    const callback = vi.fn();

    ioMock.mockReturnValueOnce(firstSocket).mockReturnValueOnce(secondSocket);

    const socketModule = await import("./socket");
    socketModule.initSocket("https://ncc.local");
    socketModule.connectSocket("token-1");

    socketModule.onOrderCreated(callback);

    expect(firstSocket.on).toHaveBeenCalledWith("orderCreated", callback);

    socketModule.connectSocket("token-2");

    expect(secondSocket.on).toHaveBeenCalledWith("orderCreated", callback);
  });
});
