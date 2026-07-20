import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import InvitationTicketPreview from "./InvitationTicketPreview";

describe("InvitationTicketPreview", () => {
  it("hiển thị ảnh giấy mời đúng tỉ lệ và mã vé", () => {
    render(
      <InvitationTicketPreview
        imageUrl="https://example.com/invitation-ticket.png"
        ticketCode="NCC-123"
      />
    );

    const image = screen.getByRole("img", { name: "Giấy mời mã NCC-123" });

    expect(image).toHaveAttribute("src", "https://example.com/invitation-ticket.png");
    expect(image).toHaveClass("h-auto!", "object-contain");
    expect(screen.getByText("NCC-123")).toBeInTheDocument();
  });

  it("hiển thị empty state gọn khi chưa có ảnh", () => {
    render(<InvitationTicketPreview imageUrl="" ticketCode="NCC-123" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Chưa có ảnh giấy mời để xem trước.");
  });

  it("thay ảnh lỗi bằng thông báo có thể xử lý", () => {
    render(<InvitationTicketPreview imageUrl="https://example.com/broken.png" />);

    fireEvent.error(screen.getByRole("img", { name: "Ảnh giấy mời" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Không thể tải ảnh giấy mời. Vui lòng làm mới và thử lại."
    );
  });

  it("đóng preview mà không để lại lớp phủ chặn giao diện", async () => {
    render(<InvitationTicketPreview imageUrl="https://example.com/invitation-ticket.png" />);

    fireEvent.click(screen.getByRole("button", { name: "Mở xem trước ảnh giấy mời" }));

    expect(screen.getByRole("dialog", { name: "Xem trước ảnh giấy mời" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Đóng ảnh xem trước" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Xem trước ảnh giấy mời" })
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId("invitation-ticket-preview-overlay")).not.toBeInTheDocument();
    });
  });

  it("hủy preview ngay khi modal đơn chi tiết đóng", () => {
    const { rerender } = render(
      <InvitationTicketPreview active imageUrl="https://example.com/invitation-ticket.png" />
    );

    fireEvent.click(screen.getByRole("button", { name: "Mở xem trước ảnh giấy mời" }));
    expect(screen.getByTestId("invitation-ticket-preview-overlay")).toBeInTheDocument();

    rerender(
      <InvitationTicketPreview
        active={false}
        imageUrl="https://example.com/invitation-ticket.png"
      />
    );

    expect(screen.queryByTestId("invitation-ticket-preview-overlay")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mở xem trước ảnh giấy mời" })).not.toBeDisabled();
  });
});
