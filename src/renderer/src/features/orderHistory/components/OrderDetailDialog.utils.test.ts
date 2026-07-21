import type { OrderDetailProps, OrderResponseProps } from "@shared/types";
import { describe, expect, it, vi } from "vitest";
import { getInvitationTicketIssuerName, refreshOrderDetailData } from "./OrderDetailDialog.utils";

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
