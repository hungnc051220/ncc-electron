import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getAuditEntityReferenceKey } from "../accessHistory.entity";
import { buildActivityViewModel } from "../accessHistory.presenter";
import ActivityDetailsDrawer from "./ActivityDetailsDrawer";

describe("ActivityDetailsDrawer", () => {
  it("renders CREATE as business snapshot information", () => {
    const activity = buildActivityViewModel(
      {
        id: 1,
        username: "admin",
        model: "PlanScreenings",
        entityId: 408929,
        action: "CREATE",
        oldValues: null,
        newValues: JSON.stringify({
          filmId: 11246,
          planCinemaId: 12107,
          projectDate: "2026-07-16",
          projectTime: "2026-07-16T20:00:00.000Z",
          roomId: 86,
          isOnlineSelling: 1,
          unsupportedBackendField: "Không hiển thị cảnh báo"
        }),
        timestamp: "2026-07-16T14:14:31+07:00"
      },
      {
        references: {
          film: {
            "11246": {
              label: "MINIONS & QUÁI VẬT-P (LỒNG TIẾNG) PHIÊN BẢN ĐẶC BIỆT",
              source: "current"
            }
          },
          planCinema: {
            "12107": {
              label: "Lịch phim từ ngày 10/07/2026 - 16/07/2026",
              source: "current"
            }
          }
        }
      }
    );

    render(<ActivityDetailsDrawer activity={activity} open onClose={vi.fn()} />);

    expect(screen.getByText("Chi tiết hoạt động")).toBeInTheDocument();
    expect(screen.getByText("Thông tin đã tạo")).toBeInTheDocument();
    expect(screen.getByText("MINIONS & QUÁI VẬT-P (LỒNG TIẾNG) PHIÊN BẢN ĐẶC BIỆT")).toHaveClass(
      "audit-snapshot-value--film",
      "font-semibold"
    );
    expect(screen.getByText("16/07/2026")).toBeInTheDocument();
    expect(screen.getByText("20:00")).toBeInTheDocument();
    expect(screen.getByText("Lịch phim từ ngày 10/07/2026 - 16/07/2026")).toBeInTheDocument();

    const metadata = screen.getByTestId("activity-meta");
    expect(metadata.querySelectorAll(".activity-meta-row")).toHaveLength(3);
    expect(within(metadata).getByText("Loại dữ liệu")).toBeInTheDocument();
    expect(within(metadata).getByText("Người thực hiện")).toBeInTheDocument();
    expect(within(metadata).getByText("Thời gian")).toBeInTheDocument();
    expect(within(metadata).getByText("14:14 16/07/2026")).toHaveClass(
      "activity-meta-value",
      "font-semibold"
    );
    expect(screen.queryByText("Đối tượng")).not.toBeInTheDocument();
    expect(screen.queryByText("Mã đối tượng")).not.toBeInTheDocument();
    expect(screen.queryByText("Tên hiện tại")).not.toBeInTheDocument();
    expect(screen.queryByText("408929")).not.toBeInTheDocument();
    expect(screen.queryByText("Một số dữ liệu cần lưu ý")).not.toBeInTheDocument();
    expect(screen.queryByText(/thông tin chưa được hỗ trợ/)).not.toBeInTheDocument();

    const planItem = screen.getByText("Kế hoạch chiếu").closest(".audit-info-item") as HTMLElement;
    expect(planItem).toHaveClass("audit-info-item--full", "md:col-span-2");
    expect(document.querySelector(".ant-drawer-content-wrapper")).toHaveStyle({ width: "96vw" });
    expect(document.querySelector(".ant-drawer-body")).toHaveStyle({ overflowX: "hidden" });
    expect(screen.queryByText("Trước thay đổi")).not.toBeInTheDocument();
  });

  it("renders UPDATE as an explicit before-and-after comparison", () => {
    const activity = buildActivityViewModel({
      id: 2,
      username: "admin",
      model: "PlanScreenings",
      entityId: 408929,
      action: "UPDATE",
      oldValues: JSON.stringify({
        projectDate: "2026-07-16",
        isOnlineSelling: 0
      }),
      newValues: JSON.stringify({
        projectDate: "2026-07-17",
        isOnlineSelling: 1
      }),
      timestamp: "2026-07-16T14:14:31+07:00"
    });

    render(<ActivityDetailsDrawer activity={activity} open onClose={vi.fn()} />);

    expect(screen.getByText("Chi tiết hoạt động")).toBeInTheDocument();
    expect(screen.getByText("Nội dung thay đổi")).toBeInTheDocument();
    expect(screen.getAllByText("Trước thay đổi").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sau thay đổi").length).toBeGreaterThan(0);
    expect(screen.getByText("Đang tắt")).toBeInTheDocument();
    expect(screen.getByText("Đang bật")).toBeInTheDocument();
  });

  it("keeps the resolved target identity in the business section without overview clutter", () => {
    const entityKey = getAuditEntityReferenceKey("Film", 11269);
    expect(entityKey).not.toBeNull();
    const activity = buildActivityViewModel(
      {
        id: 5,
        username: "admin",
        model: "Film",
        entityId: 11269,
        action: "UPDATE",
        oldValues: JSON.stringify({ premieredDay: "2026-07-16" }),
        newValues: JSON.stringify({ premieredDay: "2026-07-17" }),
        timestamp: "2026-07-16T14:14:31+07:00"
      },
      {
        references: {
          entity: {
            [entityKey as string]: { label: "SHREK 5", source: "current" }
          }
        }
      }
    );

    render(<ActivityDetailsDrawer activity={activity} open onClose={vi.fn()} />);

    const identity = screen
      .getByText("SHREK 5")
      .closest(".activity-entity-identity") as HTMLElement;
    expect(identity).toBeInTheDocument();
    expect(within(identity).getByText("Phim")).toBeInTheDocument();
    expect(screen.queryByText("Đối tượng")).not.toBeInTheDocument();
    expect(screen.queryByText("Mã đối tượng")).not.toBeInTheDocument();
    expect(screen.queryByText("Tên hiện tại")).not.toBeInTheDocument();
    expect(screen.queryByText("11269")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Tên đối tượng hoặc dữ liệu liên quan được hiển thị theo thông tin hiện tại."
      )
    ).not.toBeInTheDocument();
    expect(screen.getByText("16/07/2026")).toBeInTheDocument();
    expect(screen.getByText("17/07/2026")).toBeInTheDocument();
  });

  it("renders DELETE from the legacy newValues snapshot fallback", () => {
    const activity = buildActivityViewModel({
      id: 3,
      username: "admin",
      model: "Room",
      entityId: 86,
      action: "DELETE",
      oldValues: null,
      newValues: JSON.stringify({ id: 86, name: "Phòng 1", isActive: true }),
      timestamp: "2026-07-16T14:14:31+07:00"
    });

    render(<ActivityDetailsDrawer activity={activity} open onClose={vi.fn()} />);

    expect(screen.getByText("Chi tiết hoạt động")).toBeInTheDocument();
    expect(screen.getByText("Thông tin đã xóa")).toBeInTheDocument();
    expect(screen.getByText("Phòng 1")).toBeInTheDocument();
    expect(screen.queryByText("Trước thay đổi")).not.toBeInTheDocument();
  });

  it("shows the audited Customer's complete surname and given name", () => {
    const activity = buildActivityViewModel({
      id: 3101,
      userId: 0,
      model: "Customer",
      entityId: 39193156,
      action: "CREATE",
      newValues: JSON.stringify({
        username: "quyen1",
        customerFirstName: "Nguyễn Hải",
        customerLastName: "Quyên"
      }),
      timestamp: "2026-05-17T13:11:00+07:00"
    });

    render(<ActivityDetailsDrawer activity={activity} open onClose={vi.fn()} />);

    const businessGrid = screen.getByTestId("audit-info-grid");
    expect(within(businessGrid).getByText("Họ và tên")).toBeInTheDocument();
    expect(within(businessGrid).getByText("Nguyễn Hải Quyên")).toHaveClass("font-semibold");
    expect(within(businessGrid).queryByText("Họ")).not.toBeInTheDocument();
    expect(within(businessGrid).queryByText("Tên")).not.toBeInTheDocument();
  });

  it("keeps redacted technical data hidden unless the user has permission", () => {
    const activity = buildActivityViewModel({
      id: 4,
      username: "admin",
      model: "Customer",
      entityId: "CUS-4",
      action: "UPDATE",
      oldValues: JSON.stringify({ username: "admin", password: "old-secret" }),
      newValues: JSON.stringify({ username: "operator", password: "new-secret" }),
      timestamp: "2026-07-16T14:14:31+07:00"
    });
    const { rerender } = render(
      <ActivityDetailsDrawer
        activity={activity}
        open
        canViewTechnicalData={false}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByText("Dữ liệu kỹ thuật")).not.toBeInTheDocument();

    rerender(
      <ActivityDetailsDrawer activity={activity} open canViewTechnicalData onClose={vi.fn()} />
    );
    fireEvent.click(screen.getByText("Dữ liệu kỹ thuật"));

    expect(screen.getByText(/\[Đã ẩn\]/)).toBeInTheDocument();
    expect(screen.queryByText(/old-secret|new-secret/)).not.toBeInTheDocument();
    expect(document.querySelector("pre")?.textContent).toContain('"entityId": "CUS-4"');
    expect(document.querySelector("pre")?.textContent).toContain('"model": "Customer"');
  });
});
