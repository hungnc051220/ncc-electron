import { useVouchers } from "@renderer/hooks/vouchers/useVouchers";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VouchersPage from "./VouchersPage";

vi.mock("@renderer/hooks/vouchers/useVouchers", () => ({
  useVouchers: vi.fn()
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/vouchers"]}>
      <VouchersPage />
    </MemoryRouter>
  );

describe("VouchersPage", () => {
  beforeEach(() => {
    vi.mocked(useVouchers).mockReturnValue({
      data: {
        data: {
          items: [
            {
              id: 11,
              name: "Khuyến mãi thứ Ba",
              description: "Giảm giá vé",
              valueType: 1,
              discountValue: 20,
              minOrderAmount: 0,
              perCustomerLimit: 1,
              totalQuantity: 100,
              usedCount: 5,
              startAt: "2026-10-01T00:00:00Z",
              endAt: "2026-12-31T00:00:00Z",
              distributionRules: []
            }
          ],
          totalItems: 1
        }
      },
      isFetching: false,
      refetch: vi.fn()
    } as never);
  });

  it("lists electronic vouchers without any paper voucher tab", () => {
    renderPage();

    expect(screen.getByText("Khuyến mãi thứ Ba")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByText("Voucher giấy")).not.toBeInTheDocument();
  });

  it("keeps the electronic voucher query and refresh behaviour unchanged", () => {
    renderPage();

    expect(useVouchers).toHaveBeenCalledWith({
      url: "/api/v1/Voucher/voucher-batch",
      method: "POST",
      data: { pageIndex: 1, pageSize: 20, status: 1 }
    });

    const refetch = vi.mocked(useVouchers).mock.results[0].value.refetch;
    fireEvent.click(screen.getByRole("button", { name: /Làm mới/ }));
    expect(refetch).toHaveBeenCalled();
  });
});
