import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { describe, expect, it, vi } from "vitest";
import { PaymentType } from "@shared/types";
import {
  buildPaperVoucherPayloadKey,
  classifyPaperVoucherOrderError,
  classifyPaperVoucherQrCreateError,
  createPaperVoucherQrWithRetry,
  getPaperVoucherQrShortPaymentMessage,
  getPaperVoucherQrUnknownStateMessage,
  isPaperVoucherQrCreateRetryable,
  needsPaperVoucherQrReconciliation,
  PAPER_VOUCHER_QR_CREATE_IN_PROGRESS_MESSAGE,
  PAPER_VOUCHER_QR_GUARD_UNAVAILABLE_MESSAGE,
  PAPER_VOUCHER_QR_OUTCOME_UNKNOWN_MESSAGE,
  PAPER_VOUCHER_QR_RETRY_DELAYS_MS,
  createPaperVoucherRequestId,
  getPaperVoucherExistingOrderMessage,
  getPaperVoucherPaymentFallbackMessage,
  getQrPayableAmount,
  isPaperVoucherOutcomeUnknown,
  isPaperVoucherPaymentMethodAllowed,
  canRecheckQrTransactionWithProvider,
  loadPaperVoucherAttempt,
  PAPER_VOUCHER_NETWORK_ERROR_MESSAGE,
  PAPER_VOUCHER_REQUEST_IN_PROGRESS_MESSAGE,
  savePaperVoucherAttempt,
  toPaperVoucherReconcileDecision,
  getPaperVoucherQrClosedMessage,
  getPaperVoucherQrPaidMessage,
  resolvePaperVoucherQrState
} from "./paperVoucherSale";
import { formatMoney } from "@renderer/lib/utils";

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
  it("allows VNPayQR only when the quote allows it (P6 VNPayQR for the remaining amount)", () => {
    expect(
      isPaperVoucherPaymentMethodAllowed(PaymentType.VNPAY, [
        "POS",
        PaymentType.VIETQR,
        PaymentType.VNPAY
      ])
    ).toBe(true);
    expect(isPaperVoucherPaymentMethodAllowed(PaymentType.VNPAY, ["POS", PaymentType.VIETQR])).toBe(
      false
    );
    expect(isPaperVoucherPaymentMethodAllowed(PaymentType.VNPAY, ["POS"])).toBe(false);
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

describe("voucher QR state (P6: backend state, never a bare transaction success)", () => {
  const detail = (
    status?: "held" | "applied" | "released" | "cancelled",
    transactionStatus?: string
  ) =>
    ({
      order: { orderPaymentTransactions: transactionStatus ? [{ status: transactionStatus }] : [] },
      paperVoucher: status ? { status } : null
    }) as never;

  it.each([
    ["applied voucher", detail("applied", "success"), "paid"],
    [
      "held voucher, provider success recorded (confirmation failed)",
      detail("held", " SUCCESS "),
      "received"
    ],
    ["held voucher, nothing received", detail("held"), "waiting"],
    ["held voucher, transaction still new", detail("held", "new"), "waiting"],
    [
      "released voucher with a success (short or late payment)",
      detail("released", "success"),
      "released"
    ],
    ["cancelled order", detail("cancelled", "success"), "cancelled"]
  ])("%s → %s", (_, inputDetail, expectedState) => {
    expect(resolvePaperVoucherQrState(inputDetail)).toBe(expectedState);
  });

  it("closed message never says the voucher was used, and flags money to reconcile", () => {
    expect(getPaperVoucherQrClosedMessage(150, "released")).toBe(
      "Đơn #150 đã kết thúc, voucher giấy đã được trả lại. Không in vé."
    );
    expect(
      getPaperVoucherQrClosedMessage(150, "released", detail("released", "success"))
    ).toContain("báo quản lý đối soát");
    expect(getPaperVoucherQrClosedMessage(150, "cancelled")).toBe(
      "Đơn #150 đã bị hủy. Không in vé."
    );
  });

  it("paid message shows the QR amount, the voucher amount and the batches", () => {
    expect(
      getPaperVoucherQrPaidMessage({
        orderTotal: 190000,
        voucherApplied: 80000,
        remainingPayable: 110000,
        lines: [
          { batchCode: "LÔ-007", quantity: 1 },
          { batchCode: "LÔ-008", quantity: 2 }
        ]
      })
    ).toBe(
      `Thanh toán VietQR thành công ${formatMoney(110000)}. Voucher giấy ${formatMoney(80000)} (LÔ-007 ×1, LÔ-008 ×2).`
    );
  });

  it("paid message names VNPayQR for a VNPayQR voucher order", () => {
    expect(
      getPaperVoucherQrPaidMessage(
        { orderTotal: 100000, voucherApplied: 80000, remainingPayable: 20000 },
        PaymentType.VNPAY
      )
    ).toBe(
      `Thanh toán VNPayQR thành công ${formatMoney(20000)}. Voucher giấy ${formatMoney(80000)}.`
    );
  });

  it("asks the provider again only for VietQR (check-transaction is VietQR only)", () => {
    expect(canRecheckQrTransactionWithProvider(PaymentType.VIETQR)).toBe(true);
    expect(canRecheckQrTransactionWithProvider(PaymentType.VNPAY)).toBe(false);
  });
});

describe("create-qr of a paper voucher order (N6)", () => {
  it.each([
    [
      "409 QR_CREATION_IN_PROGRESS",
      createAxiosError(409, { code: "PAPER_VOUCHER_QR_CREATION_IN_PROGRESS" }),
      "in-progress",
      true
    ],
    [
      "503 REQUEST_GUARD_UNAVAILABLE",
      createAxiosError(503, { code: "PAPER_VOUCHER_REQUEST_GUARD_UNAVAILABLE" }),
      "guard-unavailable",
      true
    ],
    ["no response (network / timeout)", createAxiosError(), "outcome-unknown", true],
    ["500 without a business code", createAxiosError(500, {}), "outcome-unknown", true],
    [
      "409 QR_TRANSACTION_NOT_REUSABLE",
      createAxiosError(409, { code: "PAPER_VOUCHER_QR_TRANSACTION_NOT_REUSABLE" }),
      "not-reusable",
      false
    ],
    [
      "400 rejected",
      createAxiosError(400, { message: "Không tìm thấy đơn hàng" }),
      "rejected",
      false
    ]
  ])("%s → %s", (_, error, kind, isRetryable) => {
    const failure = classifyPaperVoucherQrCreateError(error);
    expect(failure.kind).toBe(kind);
    expect(isPaperVoucherQrCreateRetryable(failure)).toBe(isRetryable);
  });

  it("uses the guidance messages for temporary errors and the backend message otherwise", () => {
    expect(
      classifyPaperVoucherQrCreateError(
        createAxiosError(503, {
          code: "PAPER_VOUCHER_REQUEST_GUARD_UNAVAILABLE",
          message: "Chưa tạo được QR"
        })
      ).message
    ).toBe(PAPER_VOUCHER_QR_GUARD_UNAVAILABLE_MESSAGE);
    expect(classifyPaperVoucherQrCreateError(createAxiosError()).message).toBe(
      PAPER_VOUCHER_QR_OUTCOME_UNKNOWN_MESSAGE
    );
    expect(
      classifyPaperVoucherQrCreateError(
        createAxiosError(400, { message: "Không tìm thấy đơn hàng" })
      ).message
    ).toBe("Không tìm thấy đơn hàng");
  });

  it("backs off 1 s, 2 s, 4 s between retries, then stops (no endless retry)", async () => {
    const waits: number[] = [];
    const create = vi
      .fn()
      .mockRejectedValue(createAxiosError(409, { code: "PAPER_VOUCHER_QR_CREATION_IN_PROGRESS" }));

    const result = await createPaperVoucherQrWithRetry(create, {
      wait: async (ms) => {
        waits.push(ms);
      }
    });

    expect(PAPER_VOUCHER_QR_RETRY_DELAYS_MS).toEqual([1000, 2000, 4000]);
    expect(waits).toEqual([1000, 2000, 4000]);
    expect(create).toHaveBeenCalledTimes(4);
    expect(result).toEqual({
      ok: false,
      failure: { kind: "in-progress", message: PAPER_VOUCHER_QR_CREATE_IN_PROGRESS_MESSAGE }
    });
  });

  it("returns the QR of the first successful retry and stops retrying", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(createAxiosError())
      .mockResolvedValueOnce({ qrcode: "vietqr://reused" });
    const onRetry = vi.fn();

    const result = await createPaperVoucherQrWithRetry(create, {
      wait: async () => undefined,
      onRetry
    });

    expect(result).toEqual({ ok: true, qr: { qrcode: "vietqr://reused" } });
    expect(create).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.objectContaining({ kind: "outcome-unknown" }));
  });

  it("never retries a definitive answer", async () => {
    const create = vi
      .fn()
      .mockRejectedValue(
        createAxiosError(409, { code: "PAPER_VOUCHER_QR_TRANSACTION_NOT_REUSABLE" })
      );
    const wait = vi.fn();

    const result = await createPaperVoucherQrWithRetry(create, { wait });

    expect(create).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
  });

  it("runs the calls one after the other and stops when the screen is gone", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    let isGone = false;
    const create = vi.fn(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      throw createAxiosError(503, { code: "PAPER_VOUCHER_REQUEST_GUARD_UNAVAILABLE" });
    });

    const result = await createPaperVoucherQrWithRetry(create, {
      wait: async () => {
        isGone = true;
      },
      shouldStop: () => isGone
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(maxInFlight).toBe(1);
    expect(result).toMatchObject({ ok: false, failure: { kind: "guard-unavailable" } });
  });
});

describe("QR reconciliation messages (N9)", () => {
  const withTransactions = (
    status: "held" | "applied" | "released" | "cancelled",
    transactions: Array<{ status: string; transactionAmount: number }>
  ) =>
    ({
      order: { orderPaymentTransactions: transactions },
      paperVoucher: { status, remainingPayable: 20000 }
    }) as never;

  it("flags a closed order that has money recorded, never a waiting or a paid one", () => {
    const success = [{ status: "success", transactionAmount: 20000 }];
    expect(needsPaperVoucherQrReconciliation(withTransactions("released", success))).toBe(true);
    expect(needsPaperVoucherQrReconciliation(withTransactions("cancelled", success))).toBe(true);
    expect(needsPaperVoucherQrReconciliation(withTransactions("released", []))).toBe(false);
    expect(needsPaperVoucherQrReconciliation(withTransactions("held", success))).toBe(false);
    expect(needsPaperVoucherQrReconciliation(withTransactions("applied", success))).toBe(false);
  });

  it("states the amount the backend recorded on a late payment", () => {
    expect(
      getPaperVoucherQrClosedMessage(
        150,
        "released",
        withTransactions("released", [
          { status: "success", transactionAmount: 20000 },
          { status: "failed", transactionAmount: 20000 }
        ])
      )
    ).toBe(
      `Đơn #150 đã kết thúc, voucher giấy đã được trả lại. Không in vé. Có giao dịch QR được ghi nhận ${formatMoney(20000)} (thiếu tiền hoặc đến muộn): báo quản lý đối soát, không tự hoàn tiền.`
    );
  });

  it("short payment: money recorded vs amount due, voucher kept, no refund promise", () => {
    const message = getPaperVoucherQrShortPaymentMessage(
      150,
      withTransactions("held", [{ status: "success", transactionAmount: 15000 }])
    );
    expect(message).toBe(
      `Đơn #150: có giao dịch QR được ghi nhận ${formatMoney(15000)} nhưng máy chủ chưa xác nhận đủ số tiền còn lại, cần thu ${formatMoney(20000)} (khách có thể đã trả thiếu). Đơn chưa hoàn tất, voucher giấy vẫn đang giữ. Không in vé. Báo quản lý đối soát, không tự hoàn tiền cho khách.`
    );
  });

  it("unknown state: no print, no release, no paid claim", () => {
    const message = getPaperVoucherQrUnknownStateMessage(150);
    expect(message).toContain("Chưa xác định được trạng thái thanh toán của đơn #150");
    expect(message).toContain("Không in vé");
    expect(message).toContain("voucher giấy chưa thay đổi");
    expect(message).not.toContain("thành công");
  });
});
