import "@testing-library/jest-dom/vitest";
import dayjs from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./msw/server";
import { queryClient } from "@renderer/lib/queryClient";
import { useAuthStore } from "@renderer/store/auth.store";
import { usePermissionStore } from "@renderer/store/permission.store";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(quarterOfYear);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  sessionStorage.clear();
  queryClient.clear();
  useAuthStore.setState({
    token: null,
    refreshToken: null,
    userId: null,
    isAuth: false
  });
  usePermissionStore.setState({
    assignments: []
  });

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });

  Object.defineProperty(window, "scrollTo", {
    writable: true,
    value: vi.fn()
  });

  HTMLCanvasElement.prototype.getContext = vi.fn(() => {
    return {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn()
    } as unknown as CanvasRenderingContext2D;
  });

});
