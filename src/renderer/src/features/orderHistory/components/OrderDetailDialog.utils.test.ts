import { OrderStatus } from "@shared/types";
import type { OrderDetailProps, OrderResponseProps } from "@shared/types";
import { describe, expect, it, vi } from "vitest";
import {
  canExportOrderETicket,
  getInvitationTicketIssuerName,
  refreshOrderDetailData,
  resolveOrderDetailView
} from "./OrderDetailDialog.utils";

describe("canExportOrderETicket", () => {
  const completedOrder = {
    orderStatusId: OrderStatus.COMPLETED,
    eTicketUrl: "",
    isInvitation: false
  };

  it("allows exporting an electronic ticket for an eligible regular order", () => {
    expect(canExportOrderETicket(completedOrder, true)).toBe(true);
  });

  it("does not allow exporting an electronic ticket for an invitation order", () => {
    expect(canExportOrderETicket({ ...completedOrder, isInvitation: true }, true)).toBe(false);
  });
});

describe("getInvitationTicketIssuerName", () => {
  it("uses the invitation ticket staff name", () => {
    const order = {
      invitationTickets: { createdByStaffName: "  Nguyễn Văn An  " }
    } as OrderResponseProps;

    expect(getInvitationTicketIssuerName(order)).toBe("Nguyễn Văn An");
  });

  it("returns a placeholder when the staff name is missing", () => {
    const order = {
      invitationTickets: { createdBy: "admin01", createdByStaffName: "" }
    } as OrderResponseProps;

    expect(getInvitationTicketIssuerName(order)).toBe("-");
  });
});

describe("refreshOrderDetailData", () => {
  it("refetches detail and waits for the order list invalidation", async () => {
    const detail = { order: { id: 101 } } as OrderDetailProps;
    const callOrder: string[] = [];
    const refetch = vi.fn(async () => {
      callOrder.push("refetch");
      return { data: detail, error: null, isError: false };
    });
    const invalidateOrders = vi.fn(async () => {
      callOrder.push("invalidate");
    });

    const result = await refreshOrderDetailData({ orderId: 101, refetch, invalidateOrders });

    expect(result).toBe(detail);
    expect(callOrder).toEqual(["refetch", "invalidate"]);
  });

  it("does not invalidate the list when refetching detail fails", async () => {
    const error = new Error("Cannot refresh order detail");
    const invalidateOrders = vi.fn();

    await expect(
      refreshOrderDetailData({
        orderId: 101,
        refetch: vi.fn().mockResolvedValue({ data: undefined, error, isError: true }),
        invalidateOrders
      })
    ).rejects.toBe(error);
    expect(invalidateOrders).not.toHaveBeenCalled();
  });
});

describe("resolveOrderDetailView", () => {
  const makeDetail = (id: number, paperVoucher?: OrderDetailProps["paperVoucher"]) =>
    ({ order: { id, orderTotal: 100000 }, paperVoucher }) as OrderDetailProps;

  it("is ready only with a fresh detail of the opened order", () => {
    const inputDetail = makeDetail(2, null);

    expect(
      resolveOrderDetailView({ orderId: 2, detail: inputDetail, isDetailFresh: true })
    ).toEqual({ status: "ready", detail: inputDetail, error: null });
  });

  it("never shows the list row or detail of another order", () => {
    const actualView = resolveOrderDetailView({
      orderId: 2,
      detail: undefined,
      isDetailFresh: false,
      fallback: makeDetail(1)
    });

    expect(actualView).toEqual({ status: "loading", detail: null, error: null });
  });

  it("previews the list row of the opened order while its detail loads", () => {
    const inputFallback = makeDetail(2);

    expect(
      resolveOrderDetailView({ orderId: 2, isDetailFresh: false, fallback: inputFallback })
    ).toEqual({ status: "preview", detail: inputFallback, error: null });
  });

  it("treats a cached detail fetched before opening as a preview, not as ready", () => {
    const inputCached = makeDetail(2, null);

    expect(
      resolveOrderDetailView({
        orderId: 2,
        detail: inputCached,
        isDetailFresh: false,
        fallback: makeDetail(2)
      })
    ).toEqual({ status: "preview", detail: inputCached, error: null });
  });

  it("keeps the preview and reports the error when loading the detail fails", () => {
    const inputError = new Error("Network Error");
    const inputFallback = makeDetail(2);

    expect(
      resolveOrderDetailView({
        orderId: 2,
        isDetailFresh: false,
        fallback: inputFallback,
        error: inputError
      })
    ).toEqual({ status: "preview", detail: inputFallback, error: inputError });
  });

  it("reports an error when nothing of the opened order is available", () => {
    const inputError = new Error("Not found");

    expect(resolveOrderDetailView({ orderId: 2, isDetailFresh: false, error: inputError })).toEqual(
      { status: "error", detail: null, error: inputError }
    );
  });

  it("is empty without an order id or when the API answers without that order", () => {
    expect(resolveOrderDetailView({ orderId: 0, isDetailFresh: false })).toMatchObject({
      status: "empty"
    });
    expect(
      resolveOrderDetailView({
        orderId: 2,
        detail: {} as OrderDetailProps,
        isDetailFresh: true
      })
    ).toMatchObject({ status: "empty", detail: null });
  });
});
