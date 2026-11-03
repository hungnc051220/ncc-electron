import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyPaperVoucherOrderError,
  createPaperVoucherRequestId,
  isPaperVoucherSaleEnabled,
  PAPER_VOUCHER_NETWORK_ERROR_MESSAGE
} from "./paperVoucherSale";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const createAxiosError = (status?: number, data?: unknown) => {
  const config = { headers: new AxiosHeaders() };
  const response =
    status === undefined
      ? undefined
      : ({ status, statusText: "", headers: {}, config, data } as AxiosResponse);

  return new AxiosError("Network Error", "ERR_TEST", config, undefined, response);
};

const quote = {
  businessDate: "2026-10-30",
  baseTotal: 190000,
  orderDiscount: 0,
  finalOrderTotal: 10000,
  paperVoucher: {
    lines: [],
    voucherQuantity: 2,
    faceValueTotal: 180000,
    voucherApplied: 180000,
    excessAmount: 0
  },
  allowedPaymentMethods: ["POS"],
  warnings: [],
  quoteHash: "b".repeat(64)
};

describe("isPaperVoucherSaleEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is enabled only when VITE_PAPER_VOUCHER_SALE_ENABLED is true", () => {
    vi.stubEnv("VITE_PAPER_VOUCHER_SALE_ENABLED", "true");
    expect(isPaperVoucherSaleEnabled()).toBe(true);
    vi.stubEnv("VITE_PAPER_VOUCHER_SALE_ENABLED", " TRUE ");
    expect(isPaperVoucherSaleEnabled()).toBe(true);

    vi.stubEnv("VITE_PAPER_VOUCHER_SALE_ENABLED", "false");
    expect(isPaperVoucherSaleEnabled()).toBe(false);
    vi.stubEnv("VITE_PAPER_VOUCHER_SALE_ENABLED", "1");
    expect(isPaperVoucherSaleEnabled()).toBe(false);
    vi.stubEnv("VITE_PAPER_VOUCHER_SALE_ENABLED", "");
    expect(isPaperVoucherSaleEnabled()).toBe(false);
  });
});

describe("classifyPaperVoucherOrderError", () => {
  it("returns the new quote of a 409 quote change", () => {
    expect(
      classifyPaperVoucherOrderError(
        createAxiosError(409, {
          statusCode: 409,
          code: "PAPER_VOUCHER_QUOTE_CHANGED",
          message: "Báo giá đã thay đổi",
          details: { quote }
        })
      )
    ).toEqual({ kind: "quote-changed", quote });
  });

  it("ignores a malformed quote in a 409 quote change", () => {
    expect(
      classifyPaperVoucherOrderError(
        createAxiosError(409, {
          code: "PAPER_VOUCHER_QUOTE_CHANGED",
          details: { quote: { quoteHash: 1 } }
        })
      )
    ).toEqual({ kind: "quote-changed", quote: undefined });
  });

  it("keeps network and server errors retryable", () => {
    expect(classifyPaperVoucherOrderError(createAxiosError())).toEqual({
      kind: "retryable",
      message: PAPER_VOUCHER_NETWORK_ERROR_MESSAGE
    });
    expect(
      classifyPaperVoucherOrderError(createAxiosError(503, { message: "Hệ thống đang bận" }))
    ).toEqual({ kind: "retryable", message: "Hệ thống đang bận" });
  });

  it.each([
    [409, "PAPER_VOUCHER_BATCH_LOCKED"],
    [409, "PAPER_VOUCHER_BATCH_EXPIRED"],
    [409, "PAPER_VOUCHER_BATCH_NOT_STARTED"],
    [409, "PAPER_VOUCHER_FACE_VALUE_CHANGED"],
    [409, "PAPER_VOUCHER_INSUFFICIENT_QUANTITY"],
    [409, "PAPER_VOUCHER_CONCURRENT_CONFLICT"],
    [404, "PAPER_VOUCHER_BATCH_NOT_FOUND"]
  ])("asks to refresh batches and re-quote for %i %s", (status, code) => {
    expect(
      classifyPaperVoucherOrderError(createAxiosError(status, { code, message: "Lô đã đổi" }))
    ).toEqual({ kind: "stale-batch", message: "Lô đã đổi" });
  });

  it.each([
    [409, "PAPER_VOUCHER_REQUEST_ID_CONFLICT"],
    [409, "PAPER_VOUCHER_REQUEST_ALREADY_CANCELLED"],
    [400, "PAPER_VOUCHER_TICKET_PRICE_UNDETERMINED"],
    [400, "PAPER_VOUCHER_POS_DISABLED"],
    [400, "PAPER_VOUCHER_PAYMENT_METHOD_NOT_ALLOWED"],
    [422, undefined]
  ])("rejects %i %s with the backend message", (status, code) => {
    expect(
      classifyPaperVoucherOrderError(createAxiosError(status, { code, message: "Bị từ chối" }))
    ).toEqual({ kind: "rejected", message: "Bị từ chối" });
  });

  it("matches codes exactly, without the PAPER_VOUCHER_ prefix nothing is special", () => {
    expect(
      classifyPaperVoucherOrderError(createAxiosError(409, { code: "QUOTE_CHANGED", message: "x" }))
    ).toEqual({ kind: "rejected", message: "x" });
  });

  it("rejects other errors with their message", () => {
    expect(classifyPaperVoucherOrderError(new Error("boom"))).toEqual({
      kind: "rejected",
      message: "boom"
    });
  });
});

describe("createPaperVoucherRequestId", () => {
  it("creates distinct UUID v4 values", () => {
    const first = createPaperVoucherRequestId();
    const second = createPaperVoucherRequestId();

    expect(first).toMatch(UUID_V4);
    expect(second).toMatch(UUID_V4);
    expect(second).not.toBe(first);
  });

  it("falls back to getRandomValues when randomUUID is unavailable", () => {
    const ownDescriptor = Object.getOwnPropertyDescriptor(crypto, "randomUUID");
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });

    try {
      expect(createPaperVoucherRequestId()).toMatch(UUID_V4);
    } finally {
      if (ownDescriptor) {
        Object.defineProperty(crypto, "randomUUID", ownDescriptor);
      } else {
        Reflect.deleteProperty(crypto, "randomUUID");
      }
    }
    expect(typeof crypto.randomUUID).toBe("function");
  });
});
