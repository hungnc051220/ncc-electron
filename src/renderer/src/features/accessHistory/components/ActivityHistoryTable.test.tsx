import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildActivityViewModel } from "../accessHistory.presenter";
import ActivityHistoryTable from "./ActivityHistoryTable";

const setResponsiveMatches = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
};

describe("ActivityHistoryTable", () => {
  it("keeps rows compact, hides raw payloads, and opens the requested activity", () => {
    const onViewDetails = vi.fn();
    const createActivity = buildActivityViewModel(
      {
        id: 8087,
        username: "admin",
        model: "PlanScreenings",
        entityId: "408929",
        action: "CREATE",
        oldValues: null,
        newValues: JSON.stringify({
          filmId: 11246,
          projectDate: "2026-07-16",
          projectTime: "2026-07-16T20:00:00.000Z",
          roomId: 86,
          isOnlineSelling: 1,
          unsupportedTechnicalField: "raw-value-that-must-not-appear"
        }),
        timestamp: "2026-07-16T14:14:31+07:00"
      },
      {
        references: {
          film: { "11246": { label: "SHREK 5", source: "current" } },
          room: { "86": { label: "Phòng 2", source: "current" } }
        }
      }
    );
    const malformedActivity = buildActivityViewModel({
      id: 8088,
      username: "operator",
      model: "PlanScreenings",
      entityId: "408930",
      action: "UPDATE",
      oldValues: "{malformed-json",
      newValues: null,
      timestamp: "2026-07-16T15:14:31+07:00"
    });
    const deletedActivity = buildActivityViewModel(
      {
        id: 8089,
        username: "admin",
        model: "PlanScreenings",
        entityId: "408931",
        action: "DELETE",
        oldValues: JSON.stringify({ filmId: 11246 }),
        newValues: null,
        timestamp: "2026-07-16T16:14:31+07:00"
      },
      { references: { film: { "11246": "SHREK 5" } } }
    );

    render(
      <ActivityHistoryTable
        dataSource={[createActivity, malformedActivity, deletedActivity]}
        pagination={false}
        onViewDetails={onViewDetails}
      />
    );

    expect(screen.getByText("Tạo lịch chiếu phim")).toBeInTheDocument();
    const filmLabels = screen.getAllByText("Phim:");
    const filmValues = screen.getAllByText("SHREK 5");
    expect(filmLabels).toHaveLength(2);
    expect(filmValues).toHaveLength(2);
    filmLabels.forEach((label) => {
      expect(label).toHaveClass("ant-typography-secondary", "font-normal");
      expect(label).not.toHaveClass("font-semibold");
    });
    filmValues.forEach((value) => {
      expect(value).toHaveClass("font-semibold", "whitespace-nowrap", "ant-typography-ellipsis");
      expect(value).not.toHaveClass("ant-typography-secondary");
    });
    expect(screen.queryByText("Phim: Phim #11246")).not.toBeInTheDocument();
    expect(screen.getByText("Không đọc được chi tiết thay đổi.")).toBeInTheDocument();
    expect(screen.queryByText("raw-value-that-must-not-appear")).not.toBeInTheDocument();
    expect(screen.queryByText("{malformed-json")).not.toBeInTheDocument();
    expect(
      screen.getByText("Tạo mới").closest(".ant-tag")?.querySelector('[data-icon="plus-circle"]')
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cập nhật").closest(".ant-tag")?.querySelector('[data-icon="edit"]')
    ).toBeInTheDocument();
    expect(
      screen.getByText("Xóa").closest(".ant-tag")?.querySelector('[data-icon="delete"]')
    ).toBeInTheDocument();
    ["Tạo mới", "Cập nhật", "Xóa"].forEach((label) => {
      expect(screen.getByText(label).closest(".ant-tag")).toHaveClass(
        "activity-action-badge",
        "w-[84px]",
        "inline-flex",
        "items-center",
        "justify-center"
      );
    });

    fireEvent.click(screen.getByLabelText("Xem chi tiết hoạt động 8088"));

    expect(onViewDetails).toHaveBeenCalledTimes(1);
    expect(onViewDetails).toHaveBeenCalledWith(malformedActivity);
  });

  it("shows the actor's complete surname and given name in the list", () => {
    setResponsiveMatches(true);
    const activity = buildActivityViewModel({
      id: 8090,
      userId: 15,
      username: "operator",
      user: {
        username: "operator",
        customerFirstName: "Nguyễn Văn",
        customerLastName: "An"
      },
      model: "Category",
      action: "CREATE",
      newValues: JSON.stringify({ name: "Phim hoạt hình" }),
      timestamp: "2026-07-16T14:14:31+07:00"
    });
    const { container } = render(
      <ActivityHistoryTable dataSource={[activity]} pagination={false} onViewDetails={vi.fn()} />
    );

    const row = container.querySelector('[data-row-key="8090"]');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(within(row as HTMLElement).queryByText("operator")).not.toBeInTheDocument();
  });

  it("shows the audited Customer's complete surname and given name in the change summary", () => {
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
    const { container } = render(
      <ActivityHistoryTable dataSource={[activity]} pagination={false} onViewDetails={vi.fn()} />
    );

    const row = container.querySelector('[data-row-key="3101"]');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("Họ và tên:")).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText("Nguyễn Hải Quyên")).toHaveClass("font-semibold");
    expect(within(row as HTMLElement).queryByText("Họ:")).not.toBeInTheDocument();
    expect(within(row as HTMLElement).queryByText("Tên:")).not.toBeInTheDocument();
  });

  it("renders UPDATE values as neutral before, secondary arrow, and emphasized after", () => {
    const activity = buildActivityViewModel({
      id: 9,
      username: "admin",
      model: "PlanScreenings",
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

    render(
      <ActivityHistoryTable dataSource={[activity]} pagination={false} onViewDetails={vi.fn()} />
    );

    ["Ngày chiếu:", "Bán vé online:"].forEach((labelText) => {
      const label = screen.getByText(labelText);
      expect(label).toHaveClass("change-label", "ant-typography-secondary", "font-normal");
    });

    ["16/07/2026", "Đang tắt"].forEach((beforeText) => {
      const before = screen.getByText(beforeText);
      expect(before).toHaveClass(
        "old-value",
        "font-normal",
        "whitespace-nowrap",
        "max-w-[40%]",
        "shrink-0",
        "opacity-80",
        "line-through",
        "decoration-1"
      );
      expect(before).not.toHaveClass("ant-typography-secondary", "flex-1");
      expect(before).not.toHaveClass("font-semibold");
      expect(before.closest(".change-values")).toHaveClass(
        "flex",
        "min-w-0",
        "flex-1",
        "gap-1",
        "overflow-hidden"
      );
    });

    ["17/07/2026", "Đang bật"].forEach((afterText) => {
      const after = screen.getByText(afterText);
      expect(after).toHaveClass("new-value", "font-semibold", "whitespace-nowrap");
      expect(after).not.toHaveClass("ant-typography-secondary");
    });

    const arrows = screen.getAllByText("→");
    expect(arrows).toHaveLength(2);
    arrows.forEach((arrow) => {
      expect(arrow).toHaveClass(
        "change-arrow",
        "ant-typography-secondary",
        "px-0.5",
        "font-normal"
      );
      expect(arrow).toHaveAttribute("aria-hidden", "true");
    });
    expect(screen.getAllByText("thành")).toHaveLength(2);
    screen.getAllByText("thành").forEach((accessibleText) => {
      expect(accessibleText).toHaveClass("sr-only");
    });
  });

  it("starts a Film update with its resolved identity and keeps before/after values compact", () => {
    const activity = buildActivityViewModel(
      {
        id: 12,
        username: "admin",
        model: "Film",
        entityId: 11269,
        action: "UPDATE",
        oldValues: JSON.stringify({ duration: 100 }),
        newValues: JSON.stringify({ duration: 90 }),
        timestamp: "2026-07-16T14:14:31+07:00"
      },
      {
        references: {
          entity: { "film:11269": { label: "SHREK 5", source: "current" } }
        }
      }
    );
    const { container } = render(
      <ActivityHistoryTable dataSource={[activity]} pagination={false} onViewDetails={vi.fn()} />
    );

    const row = container.querySelector('[data-row-key="12"]');
    const changeLabel = within(row as HTMLElement).getByText("Thời lượng phim (phút):");
    const summaryCell = changeLabel.closest("td");
    expect(summaryCell).toBeDefined();
    expect(summaryCell as HTMLElement).toHaveTextContent(
      /Phim:\s*SHREK 5\s*Thời lượng phim \(phút\):\s*100\s*thành\s*→\s*90/
    );

    const identityLabel = within(summaryCell as HTMLElement).getByText("Phim:");
    const identityValue = within(summaryCell as HTMLElement).getByText("SHREK 5");
    const before = within(summaryCell as HTMLElement).getByText("100");
    const after = within(summaryCell as HTMLElement).getByText("90");

    expect(identityLabel).toHaveClass("change-label", "ant-typography-secondary", "font-normal");
    expect(identityValue).toHaveClass("entity-value", "font-semibold", "ant-typography-ellipsis");
    expect(changeLabel).toHaveClass("change-label", "ant-typography-secondary", "font-normal");
    expect(before).toHaveClass(
      "old-value",
      "max-w-[40%]",
      "shrink-0",
      "font-normal",
      "opacity-80",
      "line-through"
    );
    expect(before).not.toHaveClass("ant-typography-secondary", "flex-1");
    expect(after).toHaveClass("new-value", "flex-1", "font-semibold");
    expect(before.closest(".change-values")?.parentElement).toHaveClass(
      "change-line",
      "gap-1",
      "overflow-hidden"
    );
  });

  it("shows no more than two structured summaries and a secondary remaining count", () => {
    const activity = buildActivityViewModel({
      id: 10,
      username: "admin",
      model: "PlanScreenings",
      action: "UPDATE",
      oldValues: JSON.stringify({
        projectDate: "2026-07-16",
        roomId: 86,
        isOnlineSelling: 0,
        priceOfPosition2: "T:80000"
      }),
      newValues: JSON.stringify({
        projectDate: "2026-07-17",
        roomId: 87,
        isOnlineSelling: 1,
        priceOfPosition2: "T:90000"
      }),
      timestamp: "2026-07-16T14:14:31+07:00"
    });

    render(
      <ActivityHistoryTable dataSource={[activity]} pagination={false} onViewDetails={vi.fn()} />
    );

    expect(screen.getByText("Ngày chiếu:")).toBeInTheDocument();
    expect(screen.getByText("Phòng chiếu:")).toBeInTheDocument();
    expect(screen.queryByText("Bán vé online:")).not.toBeInTheDocument();
    const remainingCount = screen.getByText("+2 thay đổi khác");
    expect(remainingCount).toHaveClass("ant-typography-secondary", "text-xs", "font-normal");
  });

  it("keeps a long value on one line and exposes the complete value through the tooltip", async () => {
    const longValue =
      "SHREK 5 - Hành trình rất dài của nhân vật qua nhiều vùng đất kỳ diệu chưa từng được kể";
    const activity = buildActivityViewModel(
      {
        id: 11,
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
          entity: { "film:11269": { label: longValue, source: "current" } }
        }
      }
    );
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const isMeasureElement = this.tagName === "EM";
        const right = isMeasureElement ? 500 : 100;
        return {
          x: 0,
          y: 0,
          left: 0,
          top: 0,
          right,
          bottom: 20,
          width: right,
          height: 20,
          toJSON: () => undefined
        } as DOMRect;
      });

    render(
      <ActivityHistoryTable dataSource={[activity]} pagination={false} onViewDetails={vi.fn()} />
    );

    const value = screen.getByText(longValue);
    expect(value).toHaveClass(
      "ant-typography-ellipsis",
      "whitespace-nowrap",
      "min-w-0",
      "font-semibold"
    );
    expect(value).toHaveTextContent(longValue);

    fireEvent.mouseEnter(value);
    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent(longValue);
    });
    rectSpy.mockRestore();
  });

  it("uses a single business label in the desktop data-type cell", () => {
    setResponsiveMatches(true);
    const activity = {
      ...buildActivityViewModel({
        id: 20,
        username: "admin",
        model: "PlanScreenings",
        entityId: "408929",
        action: "CREATE",
        oldValues: null,
        newValues: null,
        timestamp: "2026-07-16T14:14:31+07:00"
      }),
      entityLabel: "Lịch chiếu SHREK 5"
    };
    const { container } = render(
      <ActivityHistoryTable dataSource={[activity]} pagination={false} onViewDetails={vi.fn()} />
    );

    expect(screen.getByRole("columnheader", { name: "Loại dữ liệu" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Đối tượng" })).not.toBeInTheDocument();

    const row = container.querySelector('[data-row-key="20"]');
    expect(row).not.toBeNull();
    const cells = row?.querySelectorAll("td");
    const dataTypeCell = cells?.[1];
    expect(dataTypeCell).toBeDefined();
    expect(within(dataTypeCell as HTMLElement).getAllByText("Lịch chiếu phim")).toHaveLength(1);
    expect(within(dataTypeCell as HTMLElement).queryByText("408929")).not.toBeInTheDocument();
    expect(
      within(dataTypeCell as HTMLElement).queryByText("Lịch chiếu SHREK 5")
    ).not.toBeInTheDocument();
    expect(
      within(dataTypeCell as HTMLElement).queryByText("PlanScreenings")
    ).not.toBeInTheDocument();
  });

  it("keeps ids, raw models, and entity names out of the compact responsive row", () => {
    setResponsiveMatches(false);
    const activity = {
      ...buildActivityViewModel({
        id: 21,
        username: "admin",
        model: "FutureInternalModel",
        entityId: "SYS-21",
        action: "CREATE",
        oldValues: null,
        newValues: null,
        timestamp: "2026-07-16T14:14:31+07:00"
      }),
      entityLabel: "Tên bản ghi nội bộ"
    };
    const { container } = render(
      <ActivityHistoryTable dataSource={[activity]} pagination={false} onViewDetails={vi.fn()} />
    );

    const row = container.querySelector('[data-row-key="21"]');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getAllByText("Dữ liệu hệ thống")).toHaveLength(1);
    expect(within(row as HTMLElement).queryByText("SYS-21")).not.toBeInTheDocument();
    expect(within(row as HTMLElement).queryByText("FutureInternalModel")).not.toBeInTheDocument();
    expect(within(row as HTMLElement).queryByText("Tên bản ghi nội bộ")).not.toBeInTheDocument();
  });
});
