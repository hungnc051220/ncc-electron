import { act, render } from "@testing-library/react";
import { Table } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AutoHeightTable from "./AutoHeightTable";

interface Row {
  key: string;
  name: string;
}

let resizeCallbacks: ResizeObserverCallback[] = [];

const rectWithHeight = (height: number): DOMRect =>
  ({
    bottom: height,
    height,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON: () => ({})
  }) as DOMRect;

describe("AutoHeightTable", () => {
  beforeEach(() => {
    resizeCallbacks = [];

    window.ResizeObserver = vi.fn().mockImplementation((callback: ResizeObserverCallback) => {
      resizeCallbacks.push(callback);

      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn()
      };
    }) as unknown as typeof ResizeObserver;
  });

  it("fills the remaining container height and excludes fixed table sections", () => {
    const { container } = render(
      <AutoHeightTable<Row>
        dataSource={[{ key: "1", name: "Dữ liệu" }]}
        columns={[{ title: "Tên", dataIndex: "name" }]}
        pagination={{ pageSize: 10 }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>Tổng</Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    );

    const heightContainer = container.firstElementChild as HTMLDivElement;
    const header = container.querySelector(".auto-height-table-measure-header") as HTMLElement;
    const pagination = container.querySelector(
      ".auto-height-table-measure-pagination"
    ) as HTMLElement;
    const summary = container.querySelector(".ant-table-summary") as HTMLElement;

    Object.defineProperty(heightContainer, "clientHeight", { configurable: true, value: 600 });
    header.getBoundingClientRect = () => rectWithHeight(48);
    pagination.getBoundingClientRect = () => rectWithHeight(40);
    summary.getBoundingClientRect = () => rectWithHeight(32);

    const paginationStyle = window.getComputedStyle(pagination);
    const paginationMargins =
      (Number.parseFloat(paginationStyle.marginTop) || 0) +
      (Number.parseFloat(paginationStyle.marginBottom) || 0);
    const expectedSectionHeight = 600 - 40 - paginationMargins;
    const expectedScrollY = expectedSectionHeight - 48 - 32;

    act(() => resizeCallbacks.forEach((callback) => callback([], {} as ResizeObserver)));

    expect(heightContainer).toHaveClass("h-full", "min-h-0", "flex-1", "overflow-hidden");
    expect(container.querySelector(".ant-table-wrapper")).toHaveStyle({ height: "100%" });
    expect(container.querySelector(".ant-table-container")).toHaveStyle({
      height: `${expectedSectionHeight}px`
    });
    expect(container.querySelector(".ant-table-body")).toHaveStyle({
      maxHeight: `${expectedScrollY}px`
    });
  });

  it("preserves caller semantic classes and horizontal scrolling", () => {
    const { container } = render(
      <AutoHeightTable<Row>
        dataSource={[{ key: "1", name: "Dữ liệu" }]}
        columns={[{ title: "Tên", dataIndex: "name" }]}
        classNames={{
          header: { wrapper: "custom-header" },
          pagination: { root: "custom-pagination" }
        }}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 900 }}
      />
    );

    expect(container.querySelector(".custom-header")).toHaveClass(
      "auto-height-table-measure-header"
    );
    expect(container.querySelector(".custom-pagination")).toHaveClass(
      "auto-height-table-measure-pagination"
    );
    expect(container.querySelector(".ant-table-body table")).toHaveStyle({ width: "900px" });
  });
});
