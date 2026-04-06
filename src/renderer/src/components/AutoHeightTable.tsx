import { cn } from "@renderer/lib/utils";
import { Table } from "antd";
import type { TableProps } from "antd";
import { useLayoutEffect, useRef, useState } from "react";

interface AutoHeightTableProps<RecordType extends object> extends TableProps<RecordType> {
  containerClassName?: string;
  minBodyHeight?: number;
}

const AutoHeightTable = <RecordType extends object>({
  containerClassName,
  minBodyHeight = 240,
  scroll,
  ...tableProps
}: AutoHeightTableProps<RecordType>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef<number>(minBodyHeight);
  const [scrollY, setScrollY] = useState<number>(minBodyHeight);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getElementOuterHeight = (selector: string) => {
      const element = container.querySelector(selector) as HTMLElement | null;
      if (!element) return 0;

      const styles = window.getComputedStyle(element);
      const marginTop = Number.parseFloat(styles.marginTop) || 0;
      const marginBottom = Number.parseFloat(styles.marginBottom) || 0;

      return element.offsetHeight + marginTop + marginBottom;
    };

    const updateScrollY = () => {
      if (container.clientHeight <= 0) {
        return;
      }

      const nextHeight =
        container.clientHeight -
        getElementOuterHeight(".ant-table-title") -
        getElementOuterHeight(".ant-table-header") -
        getElementOuterHeight(".ant-table-summary") -
        getElementOuterHeight(".ant-table-footer") -
        getElementOuterHeight(".ant-table-pagination") -
        8;

      if (nextHeight <= 0) {
        return;
      }

      const normalizedHeight = Math.max(minBodyHeight, nextHeight);

      if (Math.abs(lastScrollYRef.current - normalizedHeight) <= 1) {
        return;
      }

      lastScrollYRef.current = normalizedHeight;
      setScrollY(normalizedHeight);
    };

    const resizeObserver = new ResizeObserver(updateScrollY);
    resizeObserver.observe(container);

    updateScrollY();

    return () => {
      resizeObserver.disconnect();
    };
  }, [minBodyHeight, tableProps.dataSource, tableProps.loading, tableProps.pagination]);

  return (
    <div
      ref={containerRef}
      className={cn("flex-1 min-h-0 min-w-0 overflow-hidden", containerClassName)}
    >
      <Table<RecordType>
        {...tableProps}
        scroll={{
          ...scroll,
          x: scroll?.x ?? "max-content",
          y: scrollY
        }}
      />
    </div>
  );
};

export type { AutoHeightTableProps };
export default AutoHeightTable;
