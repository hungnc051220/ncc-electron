import { queryClient } from "@renderer/lib/queryClient";
import type { U22PriceConfig } from "@shared/types";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_U22_CONFIG, setupU22Server, U22TestProviders } from "../../u22Price.testUtils";
import U22PriceEditDialog from "./U22PriceEditDialog";

const renderDialog = (config: U22PriceConfig = SEED_U22_CONFIG) => {
  const onClose = vi.fn();
  render(
    <U22TestProviders>
      <U22PriceEditDialog config={config} onClose={onClose} />
    </U22TestProviders>
  );
  return { onClose };
};

const typePrice = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const getSaveButton = () => screen.getByRole("button", { name: /Lưu giá/ });

// Dialog/bảng antd: khi chạy song song toàn bộ test có thể chậm hơn mặc định 5 s (như test voucher giấy).
describe("U22PriceEditDialog", { timeout: 30000 }, () => {
  beforeEach(() => queryClient.clear());

  it("keeps Lưu giá disabled until a price changes", async () => {
    await setupU22Server();
    renderDialog();

    expect(getSaveButton()).toBeDisabled();
    expect(screen.getByText("Chưa có thay đổi")).toBeInTheDocument();
  });

  it("edits the T6–CN group, previews the week and saves 7 prices with the version", async () => {
    const state = await setupU22Server();
    const { onClose } = renderDialog();

    typePrice("Giá Thứ 6 – Chủ nhật", "80000");

    expect(screen.getByText("3 ngày thay đổi")).toBeInTheDocument();
    expect(getSaveButton()).toBeEnabled();
    fireEvent.click(getSaveButton());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(state.putBodies).toEqual([
      {
        priceMon: 55000,
        priceTue: 55000,
        priceWed: 55000,
        priceThu: 55000,
        priceFri: 80000,
        priceSat: 80000,
        priceSun: 80000,
        version: 1
      }
    ]);
    expect(await screen.findByText("Đã lưu giá vé U22")).toBeInTheDocument();
  });

  it("advanced mode: a Saturday-only price marks the group as custom", async () => {
    await setupU22Server();
    renderDialog();

    fireEvent.click(screen.getByRole("switch", { name: "Chỉnh riêng từng thứ" }));
    typePrice("Giá Thứ 7", "90000");

    expect(screen.getByText("Có giá riêng")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Chỉnh riêng từng thứ" })).toBeDisabled();
    expect(screen.getByText("1 ngày thay đổi")).toBeInTheDocument();
  });

  it("asks before a group price overwrites the weekday-specific prices", async () => {
    await setupU22Server();
    renderDialog({
      ...SEED_U22_CONFIG,
      priceFri: 80000,
      priceSat: 90000,
      priceSun: 90000,
      version: 2
    });

    typePrice("Giá chung mới cho Thứ 6 – Chủ nhật", "70000");
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng cho cả nhóm" }));

    const popconfirm = await screen.findByText("Áp dụng 70.000đ cho cả nhóm T6–CN?");
    const popover = popconfirm.closest(".ant-popover") as HTMLElement;
    expect(within(popover).getByText(/Thứ 6:/)).toBeInTheDocument();
    expect(within(popover).getByText(/Thứ 7:/)).toBeInTheDocument();
    fireEvent.click(within(popover).getByRole("button", { name: "Ghi đè và áp dụng" }));

    await waitFor(() => expect(screen.queryByText("Có giá riêng")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Giá Thứ 6 – Chủ nhật")).toHaveValue("70.000");
  });

  it("refuses an empty or invalid day before calling the API", async () => {
    const state = await setupU22Server();
    renderDialog();

    fireEvent.click(screen.getByRole("switch", { name: "Chỉnh riêng từng thứ" }));
    typePrice("Giá Thứ 2", "");
    fireEvent.click(getSaveButton());

    expect(await screen.findByText(/Nhập đủ giá cho cả 7 ngày/)).toBeInTheDocument();
    expect(state.putBodies).toHaveLength(0);
  });

  it("409: shows who saved first, does not overwrite and locks Lưu giá", async () => {
    await setupU22Server({
      putError: {
        status: 409,
        body: {
          statusCode: 409,
          code: "U22_PRICE_CONFIG_CHANGED",
          message: "Giá vé U22 vừa được người khác cập nhật. Vui lòng tải lại và thử lại.",
          details: {
            current: {
              ...SEED_U22_CONFIG,
              version: 2,
              updatedUser: "ketoan01",
              updatedOnUtc: "2026-11-08T03:12:00.000Z"
            }
          }
        }
      }
    });
    const { onClose } = renderDialog();

    typePrice("Giá Thứ 2 – Thứ 5", "60000");
    fireEvent.click(getSaveButton());

    expect(await screen.findByText("Giá U22 vừa được cập nhật bởi người khác")).toBeInTheDocument();
    expect(screen.getByText(/ketoan01 đã lưu lúc 08\/11\/2026 10:12/)).toBeInTheDocument();
    expect(getSaveButton()).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it.each([
    [
      400,
      "U22_INVALID_PRICE_CONFIG",
      "Giá U22 không hợp lệ (priceMon): phải là bội số của 1.000đ."
    ],
    [403, "STAFF_PERMISSION_DENIED", "Bạn không có quyền chỉnh sửa giá vé (ticket_prices.update)."]
  ])(
    "%i %s: shows the backend message and keeps the dialog open",
    async (status, code, message) => {
      await setupU22Server({ putError: { status, body: { statusCode: status, code, message } } });
      const { onClose } = renderDialog();

      typePrice("Giá Thứ 2 – Thứ 5", "60000");
      fireEvent.click(getSaveButton());

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    }
  );
});
