import { useVouchers } from "@renderer/hooks/vouchers/useVouchers";
import { usePermissionStore } from "@renderer/store/permission.store";
import type { PermissionAssignment } from "@shared/types";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { paperVoucherMockRepository } from "./paperVouchers/paperVoucher.mock";
import { PaperVoucherTestProviders } from "./paperVouchers/paperVoucher.testUtils";
import VouchersPage from "./VouchersPage";

vi.mock("@renderer/hooks/vouchers/useVouchers", () => ({
  useVouchers: vi.fn()
}));

const ALL_ACTIONS = {
  access: true,
  list: true,
  view: true,
  create: true,
  update: true,
  delete: true
};

const setAssignments = (keys: string[]) => {
  const assignments: PermissionAssignment[] = keys.map((permissionKey) => ({
    permissionKey,
    actions: ALL_ACTIONS
  }));
  usePermissionStore.setState({ assignments });
  return assignments;
};

const renderPage = () =>
  render(
    <PaperVoucherTestProviders>
      <Routes>
        <Route path="/vouchers" element={<VouchersPage />} />
        <Route path="/403" element={<div>Trang 403</div>} />
      </Routes>
    </PaperVoucherTestProviders>
  );

const getTab = (name: string) => screen.queryByRole("tab", { name });

describe("VouchersPage", () => {
  beforeEach(() => {
    paperVoucherMockRepository.reset();
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

  it("shows both tabs and opens the promotion tab first when both permissions are granted", () => {
    setAssignments(["vouchers", "paper_vouchers"]);
    renderPage();

    expect(getTab("Chương trình khuyến mãi")).toHaveAttribute("aria-selected", "true");
    expect(getTab("Voucher giấy")).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("Khuyến mãi thứ Ba")).toBeInTheDocument();
  });

  it("keeps the electronic voucher query and refresh behaviour unchanged", () => {
    setAssignments(["vouchers"]);
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

  it("hides the paper voucher tab without paper_vouchers permission", () => {
    setAssignments(["vouchers"]);
    renderPage();

    expect(getTab("Chương trình khuyến mãi")).toBeInTheDocument();
    expect(getTab("Voucher giấy")).not.toBeInTheDocument();
  });

  it("opens the paper voucher tab by default when only paper_vouchers is granted", async () => {
    setAssignments(["paper_vouchers"]);
    renderPage();

    expect(getTab("Chương trình khuyến mãi")).not.toBeInTheDocument();
    expect(getTab("Voucher giấy")).toHaveAttribute("aria-selected", "true");
    expect(useVouchers).not.toHaveBeenCalled();
    expect(await screen.findByText("Voucher giấy 100.000đ - 2026")).toBeInTheDocument();
  });

  it("denies access when neither permission is granted", () => {
    setAssignments([]);
    renderPage();

    expect(screen.getByText("Trang 403")).toBeInTheDocument();
  });

  it("has no DEV preview switch or other way to bypass paper voucher permissions", () => {
    const assignments = setAssignments(["vouchers"]);
    renderPage();

    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByText(/Xem trước quyền|DEV/)).not.toBeInTheDocument();
    expect(getTab("Voucher giấy")).not.toBeInTheDocument();
    expect(usePermissionStore.getState().assignments).toBe(assignments);
  });

  it("hides the paper voucher tab when paper_vouchers exists without access", () => {
    usePermissionStore.setState({
      assignments: [
        { permissionKey: "vouchers", actions: ALL_ACTIONS },
        { permissionKey: "paper_vouchers", actions: { ...ALL_ACTIONS, access: false } }
      ]
    });
    renderPage();

    expect(getTab("Voucher giấy")).not.toBeInTheDocument();
  });

  it("follows assignment updates without switching away from the current tab", () => {
    setAssignments(["vouchers"]);
    renderPage();

    act(() => {
      setAssignments(["vouchers", "paper_vouchers"]);
    });

    expect(getTab("Voucher giấy")).toBeInTheDocument();
    expect(getTab("Chương trình khuyến mãi")).toHaveAttribute("aria-selected", "true");
  });
});
