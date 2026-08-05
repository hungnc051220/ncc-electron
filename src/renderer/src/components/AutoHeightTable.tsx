import { cn } from "@renderer/lib/utils";
import { Table } from "antd";
import type { GetRef, TableProps } from "antd";
import { useLayoutEffect, useRef, useState } from "react";

interface AutoHeightTableProps<RecordType extends object> extends TableProps<RecordType> {
  containerClassName?: string;
  minBodyHeight?: number;
}

const measureClassNames = {
  header: "auto-height-table-measure-header",
  pagination: "auto-height-table-measure-pagination",
  title: "auto-height-table-measure-title",
  footer: "auto-height-table-measure-footer"
};

type TableClassNames<RecordType extends object> = NonNullable<TableProps<RecordType>["classNames"]>;
type TableClassNamesFunction<RecordType extends object> = Extract<
  TableClassNames<RecordType>,
  (...args: never[]) => unknown
>;
type TableClassNamesObject<RecordType extends object> = Exclude<
  TableClassNames<RecordType>,
  TableClassNamesFunction<RecordType>
>;

type TableStyles<RecordType extends object> = NonNullable<TableProps<RecordType>["styles"]>;
type TableStylesFunction<RecordType extends object> = Extract<
  TableStyles<RecordType>,
  (...args: never[]) => unknown
>;
type TableStylesObject<RecordType extends object> = Exclude<
  TableStyles<RecordType>,
  TableStylesFunction<RecordType>
>;

const withMeasureClassNames = <RecordType extends object>(
  classNames?: TableClassNamesObject<RecordType>
): TableClassNamesObject<RecordType> => ({
  ...classNames,
  header: {
    ...classNames?.header,
    wrapper: cn(measureClassNames.header, classNames?.header?.wrapper)
  },
  pagination: {
    ...classNames?.pagination,
    root: cn(measureClassNames.pagination, classNames?.pagination?.root)
  },
  title: cn(measureClassNames.title, classNames?.title),
  footer: cn(measureClassNames.footer, classNames?.footer)
});

const getClassNames = <RecordType extends object>(
  classNames: TableProps<RecordType>["classNames"]
): TableProps<RecordType>["classNames"] => {
  if (typeof classNames === "function") {
    return (info) => withMeasureClassNames<RecordType>(classNames(info));
  }

  return withMeasureClassNames<RecordType>(classNames);
};

const withSectionHeight = <RecordType extends object>(
  styles: TableStylesObject<RecordType> | undefined,
  sectionHeight: number
): TableStylesObject<RecordType> => ({
  ...styles,
  section: {
    ...styles?.section,
    height: sectionHeight
  }
});

const getStyles = <RecordType extends object>(
  styles: TableProps<RecordType>["styles"],
  sectionHeight: number
): TableProps<RecordType>["styles"] => {
  if (typeof styles === "function") {
    return (info) => withSectionHeight<RecordType>(styles(info), sectionHeight);
  }

  return withSectionHeight<RecordType>(styles, sectionHeight);
};

const AutoHeightTable = <RecordType extends object>({
  containerClassName,
  minBodyHeight = 0,
  classNames,
  scroll,
  style,
  styles,
  ...tableProps
}: AutoHeightTableProps<RecordType>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<GetRef<typeof Table>>(null);
  const lastMeasurementsRef = useRef({ scrollY: minBodyHeight, sectionHeight: 0 });
  const [scrollY, setScrollY] = useState<number>(minBodyHeight);
  const [sectionHeight, setSectionHeight] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getElementOuterHeight = (selector: string) => {
      const element = tableRef.current?.nativeElement?.querySelector<HTMLElement>(selector);
      if (!element) return 0;

      const styles = window.getComputedStyle(element);
      const marginTop = Number.parseFloat(styles.marginTop) || 0;
      const marginBottom = Number.parseFloat(styles.marginBottom) || 0;

      return element.getBoundingClientRect().height + marginTop + marginBottom;
    };

    const updateMeasurements = () => {
      const totalHeight = container.clientHeight;
      const nextSectionHeight = Math.max(
        0,
        Math.floor(
          totalHeight -
            getElementOuterHeight(`.${measureClassNames.title}`) -
            getElementOuterHeight(`.${measureClassNames.footer}`) -
            getElementOuterHeight(`.${measureClassNames.pagination}`)
        )
      );
      const nextScrollY = Math.max(
        minBodyHeight,
        Math.floor(
          nextSectionHeight -
            getElementOuterHeight(`.${measureClassNames.header}`) -
            getElementOuterHeight(".ant-table-summary")
        )
      );
      const lastMeasurements = lastMeasurementsRef.current;

      if (
        Math.abs(lastMeasurements.scrollY - nextScrollY) <= 1 &&
        Math.abs(lastMeasurements.sectionHeight - nextSectionHeight) <= 1
      ) {
        return;
      }

      lastMeasurementsRef.current = {
        scrollY: nextScrollY,
        sectionHeight: nextSectionHeight
      };
      setScrollY(nextScrollY);
      setSectionHeight(nextSectionHeight);
    };

    const resizeObserver = new ResizeObserver(updateMeasurements);
    resizeObserver.observe(container);

    const tableElement = tableRef.current?.nativeElement;
    if (tableElement) {
      resizeObserver.observe(tableElement);

      tableElement
        .querySelectorAll<HTMLElement>(
          `.${measureClassNames.header}, .${measureClassNames.pagination}, .ant-table-summary`
        )
        .forEach((element) => resizeObserver.observe(element));
    }

    updateMeasurements();

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    minBodyHeight,
    tableProps.columns,
    tableProps.dataSource,
    tableProps.footer,
    tableProps.loading,
    tableProps.pagination,
    tableProps.summary,
    tableProps.title
  ]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full min-h-0 min-w-0 flex-1 overflow-hidden [&_.ant-table-thead_.ant-table-cell]:whitespace-nowrap",
        containerClassName
      )}
    >
      <Table<RecordType>
        {...tableProps}
        ref={tableRef}
        classNames={getClassNames<RecordType>(classNames)}
        scroll={{
          ...scroll,
          x: scroll?.x ?? "max-content",
          y: scrollY
        }}
        style={{ ...style, height: "100%" }}
        styles={getStyles<RecordType>(styles, sectionHeight)}
      />
    </div>
  );
};

export type { AutoHeightTableProps };
export default AutoHeightTable;
