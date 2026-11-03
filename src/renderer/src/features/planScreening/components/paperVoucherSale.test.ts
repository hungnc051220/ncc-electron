import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaymentType } from "@shared/types";
import {
  buildPaperVoucherPayloadKey,
  classifyPaperVoucherOrderError,
  createPaperVoucherRequestId,
  getPaperVoucherExistingOrderMessage,
  getPaperVoucherPaymentFallbackMessage,
  getQrPayableAmount,
  isPaperVoucherOutcomeUnknown,
  isPaperVoucherPaymentMethodAllowed,
  isPaperVoucherSaleEnabled,
  loadPaperVoucherAttempt,
  PAPER_VOUCHER_NETWORK_ERROR_MESSAGE,
  PAPER_VOUCHER_REQUEST_IN_PROGRESS_MESSAGE,
  savePaperVoucherAttempt,
  toPaperVoucherReconcileDecision
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

// Hai vé 190.000đ, voucher 80.000đ: khách trả thêm 110.000đ (không còn chặn đơn nhiều vé).
const quote = {
  businessDate: "2026-10-30",
  orderTotal: 190000,
  orderDiscount: 0,
  voucherQuantity: 1,
  faceValueTotal: 80000,
  voucherApplied: 80000,
  remainingPayable: 110000,
  excessAmount: 0,
  lines: [],
  allowedPaymentMethods: ["POS", "Payments.VietQR"],
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

  it.each([
    ["a malformed hash", { ...quote, quoteHash: 1 }],
    ["the old rev 6 shape", { quoteHash: "c".repeat(64), baseTotal: 1, finalOrderTotal: 0 }],
    ["a missing remaining amount", { ...quote, remainingPayable: undefined }]
  ])("ignores %s in a 409 quote change", (_name, malformed) => {
    expect(
      classifyPaperVoucherOrderError(
        createAxiosError(409, {
          code: "PAPER_VOUCHER_QUOTE_CHANGED",
          details: { quote: malformed }
        })
      )
    ).toEqual({ kind: "quote-changed", quote: undefined });
  });

  it("asks to fall back to cash when the payment method is not allowed", () => {
    expect(
      classifyPaperVoucherOrderError(
        createAxiosError(400, {
          code: "PAPER_VOUCHER_PAYMENT_METHOD_NOT_ALLOWED",
          message: "Phương thức thanh toán không được phép"
        })
      )
    ).toEqual({
      kind: "payment-method-not-allowed",
      message: "Phương thức thanh toán không được phép"
    });
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

  it("treats an attempt still running and a request id bound to another payload as unknown outcomes", () => {
    const actualInProgress = classifyPaperVoucherOrderError(
      createAxiosError(409, { code: "PAPER_VOUCHER_REQUEST_IN_PROGRESS", message: "x" })
    );
    const actualConflict = classifyPaperVoucherOrderError(
      createAxiosError(409, { code: "PAPER_VOUCHER_REQUEST_ID_CONFLICT", message: "Mã đã dùng" })
    );

    expect(actualInProgress).toEqual({
      kind: "in-progress",
      message: PAPER_VOUCHER_REQUEST_IN_PROGRESS_MESSAGE
    });
    expect(actualConflict).toEqual({ kind: "request-conflict", message: "Mã đã dùng" });
    expect([actualInProgress, actualConflict].every(isPaperVoucherOutcomeUnknown)).toBe(true);
    expect(isPaperVoucherOutcomeUnknown(classifyPaperVoucherOrderError(createAxiosError()))).toBe(
      true
    );
  });

  it.each([
    [409, "PAPER_VOUCHER_QUOTE_CHANGED"],
    [409, "PAPER_VOUCHER_INSUFFICIENT_QUANTITY"],
    [400, "PAPER_VOUCHER_PAYMENT_METHOD_NOT_ALLOWED"],
    [400, "PAPER_VOUCHER_POS_DISABLED"]
  ])("knows that %i %s wrote nothing (next attempt gets a new request id)", (status, code) => {
    expect(
      isPaperVoucherOutcomeUnknown(
        classifyPaperVoucherOrderError(createAxiosError(status, { code, message: "x" }))
      )
    ).toBe(false);
  });

  it.each([
    [409, "PAPER_VOUCHER_REQUEST_ALREADY_CANCELLED"],
    [409, "PAPER_VOUCHER_QR_PAYMENT_NOT_CONFIRMED"],
    [400, "PAPER_VOUCHER_POS_DISABLED"],
    [400, "PAPER_VOUCHER_ORDER_TOTAL_ZERO"],
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

describe("isPaperVoucherPaymentMethodAllowed", () => {
  it("never allows VNPayQR with a paper voucher", () => {
    expect(isPaperVoucherPaymentMethodAllowed(PaymentType.VNPAY)).toBe(false);
    expect(isPaperVoucherPaymentMethodAllowed(PaymentType.VNPAY, ["POS", PaymentType.VNPAY])).toBe(
      false
    );
  });

  it("follows the allowed methods of the quote", () => {
    expect(isPaperVoucherPaymentMethodAllowed("POS", ["POS"])).toBe(true);
    expect(isPaperVoucherPaymentMethodAllowed(PaymentType.VIETQR, ["POS"])).toBe(false);
    expect(
      isPaperVoucherPaymentMethodAllowed(PaymentType.VIETQR, ["POS", PaymentType.VIETQR])
    ).toBe(true);
  });

  it("keeps cash and VietQR selectable while the quote is pending", () => {
    expect(isPaperVoucherPaymentMethodAllowed("POS")).toBe(true);
    expect(isPaperVoucherPaymentMethodAllowed(PaymentType.VIETQR)).toBe(true);
  });

  it("explains the fallback to cash", () => {
    expect(getPaperVoucherPaymentFallbackMessage(PaymentType.VIETQR)).toBe(
      "Quét VietQR không dùng được cho đơn có voucher giấy này. Đã chuyển sang tiền mặt."
    );
  });
});

describe("getQrPayableAmount", () => {
  const paperVoucher = { orderTotal: 100000, voucherApplied: 80000, remainingPayable: 20000 };

  it("charges the order total without a paper voucher", () => {
    expect(getQrPayableAmount({ orderTotal: 100000 })).toBe(100000);
    expect(getQrPayableAmount({ orderTotal: 100000, transactionAmount: 1 })).toBe(100000);
  });

  it("charges the create-qr transaction amount of a paper voucher order", () => {
    expect(getQrPayableAmount({ orderTotal: 100000, transactionAmount: 20000, paperVoucher })).toBe(
      20000
    );
  });

  it("falls back to the remaining amount when create-qr has no transaction amount", () => {
    expect(getQrPayableAmount({ orderTotal: 100000, paperVoucher })).toBe(20000);
  });
});

describe("one request id per payload", () => {
  const cashBody = {
    planScreenId: 1,
    paymentMethodSystemName: "POS",
    paperVouchers: [{ batchId: 5, quantity: 1, faceValue: 80000 }],
    paperVoucherQuoteHash: "a".repeat(64),
    expectedRemainingPayable: 20000
  };

  it("ignores the request id, field order and undefined fields", () => {
    const { expectedRemainingPayable, ...rest } = cashBody;
    const actualReordered = buildPaperVoucherPayloadKey({
      expectedRemainingPayable,
      paperVoucherRequestId: "6f1c2a8e-1d2b-4c3d-8e4f-5a6b7c8d9e0f",
      customerId: undefined,
      ...rest
    });

    expect(actualReordered).toBe(buildPaperVoucherPayloadKey(cashBody));
  });

  it.each([
    ["payment method", { paymentMethodSystemName: PaymentType.VIETQR }],
    ["quote hash", { paperVoucherQuoteHash: "b".repeat(64) }],
    ["remaining payable", { expectedRemainingPayable: 30000 }],
    ["voucher lines", { paperVouchers: [{ batchId: 5, quantity: 2, faceValue: 80000 }] }]
  ])("a different %s is a different payload", (_label, change) => {
    expect(buildPaperVoucherPayloadKey({ ...cashBody, ...change })).not.toBe(
      buildPaperVoucherPayloadKey(cashBody)
    );
  });

  it("keeps an attempt with an unknown outcome for the session, forgets the answered ones", () => {
    const attempt = {
      requestId: "6f1c2a8e-1d2b-4c3d-8e4f-5a6b7c8d9e0f",
      payloadKey: buildPaperVoucherPayloadKey(cashBody),
      outcomeUnknown: true
    };

    savePaperVoucherAttempt(attempt);
    expect(loadPaperVoucherAttempt()).toEqual(attempt);

    savePaperVoucherAttempt({ ...attempt, outcomeUnknown: false });
    expect(loadPaperVoucherAttempt()).toBeNull();

    sessionStorage.setItem("paperVoucherPendingAttempt", "{broken");
    expect(loadPaperVoucherAttempt()).toBeNull();
  });
});

describe("toPaperVoucherReconcileDecision", () => {
  const requestId = "6f1c2a8e-1d2b-4c3d-8e4f-5a6b7c8d9e0f";
  const orderWith = (status: "held" | "applied" | "released" | "cancelled") =>
    ({
      id: 9001,
      paymentMethodSystemName: "POS",
      paperVoucher: { status, paymentMethodSystemName: "POS" }
    }) as never;

  it.each(["applied", "held"] as const)("a %s order exists: never sell again", (status) => {
    expect(
      toPaperVoucherReconcileDecision({ requestId, state: "found", order: orderWith(status) })
    ).toEqual({ kind: "existing-order", order: orderWith(status) });
  });

  it.each(["released", "cancelled"] as const)(
    "a %s checkout is closed: a new sale may start",
    (status) => {
      expect(
        toPaperVoucherReconcileDecision({ requestId, state: "found", order: orderWith(status) })
      ).toEqual({ kind: "free" });
    }
  );

  it("waits while the attempt runs, and when the order could not be read", () => {
    expect(toPaperVoucherReconcileDecision({ requestId, state: "in_progress" })).toEqual({
      kind: "in-progress"
    });
    expect(toPaperVoucherReconcileDecision({ requestId, state: "found" })).toEqual({
      kind: "in-progress"
    });
  });

  it("nothing recorded: a new sale may start", () => {
    expect(toPaperVoucherReconcileDecision({ requestId, state: "not_found" })).toEqual({
      kind: "free"
    });
  });

  it("names the existing order and how its rest was paid", () => {
    expect(getPaperVoucherExistingOrderMessage(orderWith("applied"))).toBe(
      "Lần bán trước đã tạo đơn #9001 (đã thanh toán, Tiền mặt). Không tạo đơn mới; kiểm tra đơn này trong lịch sử đơn hàng."
    );
  });

  it("never presents a QR order still waiting for payment as paid", () => {
    const inputHeldQr = {
      id: 9002,
      paymentMethodSystemName: PaymentType.VIETQR,
      paperVoucher: { status: "held", paymentMethodSystemName: PaymentType.VIETQR }
    } as never;

    const actual = getPaperVoucherExistingOrderMessage(inputHeldQr);

    expect(actual).toContain("đang chờ thanh toán");
    expect(actual).toContain("chưa thu tiền");
    expect(actual).not.toContain("đã thanh toán");
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
