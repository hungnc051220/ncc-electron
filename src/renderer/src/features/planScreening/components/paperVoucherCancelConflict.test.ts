import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import { OrderResponseProps, OrderStatus, PaymentStatus } from "@shared/types";
import { getOrderCancelConflictMessage, isOrderCancelConflict } from "./paperVoucherCancelConflict";

const createApiError = (status?: number, data?: unknown) => {
  const config = { headers: new AxiosHeaders() };
  const response =
    status === undefined
      ? undefined
      : ({ status, statusText: "", headers: {}, config, data } as AxiosResponse);
  return new AxiosError("Request failed", AxiosError.ERR_BAD_REQUEST, config, undefined, response);
};

const createOrder = (overrides: Partial<OrderResponseProps> = {}) =>
  ({
    id: 456,
    orderStatusId: OrderStatus.COMPLETED,
    paymentStatusId: PaymentStatus.PAID,
    orderPaymentTransactions: [],
    ...overrides
  }) as unknown as OrderResponseProps;

describe("paperVoucherCancelConflict (O-8: the order changed after the cashier started the cancel)", () => {
  it.each(["PAPER_VOUCHER_QR_PAYMENT_RECEIVED", "PAPER_VOUCHER_ORDER_LOCKED"])(
    "recognises a 409 %s as a cancel refused because the order changed",
    (inputCode) => {
      expect(isOrderCancelConflict(createApiError(409, { statusCode: 409, code: inputCode }))).toBe(
        true
      );
    }
  );

  it.each<[string, AxiosError]>([
    [
      "another 409",
      createApiError(409, { statusCode: 409, code: "PAPER_VOUCHER_CONCURRENT_CONFLICT" })
    ],
    [
      "a 400 already cancelled",
      createApiError(400, { statusCode: 400, message: "đã được hủy trước đó" })
    ],
    ["a network error", createApiError()]
  ])("keeps %s as a plain error", (_, inputError) => {
    expect(isOrderCancelConflict(inputError)).toBe(false);
  });

  it("paid meanwhile: tells the cashier to view / reprint the tickets, and to start a new cancel if needed", () => {
    const actual = getOrderCancelConflictMessage({
      orderId: 456,
      order: createOrder(),
      fallback: "backend message"
    });

    expect(actual).toContain("Đơn #456 đã được thanh toán");
    expect(actual).toContain("in lại vé");
    expect(actual).toContain("chọn lại đơn và hủy lại");
  });

  it("money received but not completed yet (IPN 99): waits for the completion", () => {
    const actual = getOrderCancelConflictMessage({
      orderId: 456,
      order: createOrder({
        orderStatusId: OrderStatus.PENDING,
        paymentStatusId: PaymentStatus.PENDING,
        orderPaymentTransactions: [{ status: "success" }]
      } as Partial<OrderResponseProps>),
      fallback: "backend message"
    });

    expect(actual).toContain("đã nhận tiền QR");
  });

  it("ended meanwhile (another cancel / QR closed)", () => {
    const actual = getOrderCancelConflictMessage({
      orderId: 456,
      order: createOrder({ orderStatusId: OrderStatus.FAIL, paymentStatusId: PaymentStatus.FAIL }),
      fallback: "backend message"
    });

    expect(actual).toContain("đã được hủy hoặc kết thúc");
  });

  it("order could not be re-read: the backend message", () => {
    expect(
      getOrderCancelConflictMessage({ orderId: 456, order: null, fallback: "backend message" })
    ).toBe("backend message");
  });
});
