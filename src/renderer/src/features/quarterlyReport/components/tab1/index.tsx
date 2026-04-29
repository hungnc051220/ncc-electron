import { useReportQuarterly } from "@renderer/hooks/reports/useReportQuarterly";
import DateRangeRequiredEmptyState from "@renderer/features/staffRevenueReport/components/DateRangeRequiredEmptyState";
import { Film, Manufacturer, MonthlyReportPlanProps } from "@shared/types";
import type { TabsProps } from "antd";
import { Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo } from "react";
import { QuarterlyReportFilterValues } from "../../types";
import { formatQuarterLabel } from "../../utils";
import ExportRevenueExcelButton from "./ExportExcel";
import RoomScreeningChart from "./RoomScreeningChart";
import TabRevenue from "./TabRevenue";

export interface TreeRow {
  key: string;
  name: string;
  isSummary?: boolean;
  [key: string]: string | number | TreeRow[] | boolean | undefined;
  children?: TreeRow[];
}

interface Tab1Props {
  filterValues: QuarterlyReportFilterValues;
}

const Tab1 = ({ filterValues }: Tab1Props) => {
  const hasFromDate = !!filterValues.fromDate;
  const hasCompareDate = !!filterValues.compareDate;

  const params = useMemo(() => {
    const payload = {
      year: filterValues.fromDate ? dayjs(filterValues.fromDate).year() : 0,
      quarter: filterValues.fromDate ? dayjs(filterValues.fromDate).quarter() : 0,
      reportType: "PLAN"
    };
    return payload;
  }, [filterValues.fromDate]);

  const compareParams = useMemo(() => {
    const payload = {
      year: filterValues.compareDate ? dayjs(filterValues.compareDate).year() : 0,
      quarter: filterValues.compareDate ? dayjs(filterValues.compareDate).quarter() : 0,
      reportType: "PLAN"
    };
    return payload;
  }, [filterValues.compareDate]);

  const { data, isFetching } = useReportQuarterly(params, hasFromDate);
  const { data: compareData, isFetching: isCompareFetching } = useReportQuarterly(
    compareParams,
    hasFromDate && hasCompareDate
  );
  const formatData = (hasFromDate ? data : undefined) as MonthlyReportPlanProps | undefined;
  const compareFormatData = (hasCompareDate ? compareData : undefined) as
    | MonthlyReportPlanProps
    | undefined;

  const getAllRooms = (data: Manufacturer[]) => {
    const set = new Set<string>();
    data.forEach((m) => m.films.forEach((f) => f.rooms.forEach((r) => set.add(r.roomName))));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  };

  const getAllRoomsForComparison = (currentData: Manufacturer[], compareData: Manufacturer[]) => {
    return Array.from(new Set([...getAllRooms(currentData), ...getAllRooms(compareData)])).sort(
      (a, b) => Number(a) - Number(b)
    );
  };

  const sumByRooms = (films: Film[], rooms: string[]): Record<string, number> => {
    const result: Record<string, number> = {};

    rooms.forEach((r) => {
      result[`P${r}`] = 0;
    });

    films.forEach((f) => {
      f.rooms.forEach((r) => {
        const key = `P${r.roomName}`;
        result[key] += r.total;
      });
    });

    return result;
  };

  const buildTreeTableData = (data: Manufacturer[], rooms: string[]): TreeRow[] => {
    return data.map((m, mIndex) => {
      const groupTotals = sumByRooms(m.films, rooms);
      return {
        key: `m-${mIndex}`,
        name: m.manufacturerName,
        isSummary: true,
        ...groupTotals,
        children: m.films.map((f, fIndex) => {
          const row: TreeRow = {
            key: `m-${mIndex}-f-${fIndex}`,
            name: f.filmName
          };

          rooms.forEach((r) => {
            row[`P${r}`] = "";
          });

          f.rooms.forEach((r) => {
            row[`P${r.roomName}`] = r.total;
          });

          return row;
        })
      };
    });
  };

  const buildComparisonTreeTableData = (
    currentData: Manufacturer[],
    compareData: Manufacturer[],
    rooms: string[]
  ): TreeRow[] => {
    const manufacturerNames = Array.from(
      new Set([
        ...currentData.map((item) => item.manufacturerName),
        ...compareData.map((item) => item.manufacturerName)
      ])
    );

    return manufacturerNames.map((manufacturerName, manufacturerIndex) => {
      const currentManufacturer = currentData.find(
        (item) => item.manufacturerName === manufacturerName
      );
      const compareManufacturer = compareData.find(
        (item) => item.manufacturerName === manufacturerName
      );

      const filmNames = Array.from(
        new Set([
          ...(currentManufacturer?.films.map((item) => item.filmName) || []),
          ...(compareManufacturer?.films.map((item) => item.filmName) || [])
        ])
      );

      const children = filmNames.map((filmName, filmIndex) => {
        const currentFilm = currentManufacturer?.films.find((item) => item.filmName === filmName);
        const compareFilm = compareManufacturer?.films.find((item) => item.filmName === filmName);
        const row: TreeRow = {
          key: `m-${manufacturerIndex}-f-${filmIndex}`,
          name: filmName
        };

        rooms.forEach((room) => {
          const currentTotal =
            currentFilm?.rooms.find((item) => item.roomName === room)?.total || 0;
          const compareTotal =
            compareFilm?.rooms.find((item) => item.roomName === room)?.total || 0;
          const diff = currentTotal - compareTotal;

          row[`P${room}_current`] = currentTotal;
          row[`P${room}_compare`] = compareTotal;
          row[`P${room}_diff`] = diff;
          row[`P${room}_percent`] = compareTotal ? (diff / compareTotal) * 100 : undefined;
        });

        return row;
      });

      const row: TreeRow = {
        key: `m-${manufacturerIndex}`,
        name: manufacturerName,
        isSummary: true,
        children
      };

      rooms.forEach((room) => {
        const currentTotal = children.reduce(
          (sum, film) => sum + Number(film[`P${room}_current`] || 0),
          0
        );
        const compareTotal = children.reduce(
          (sum, film) => sum + Number(film[`P${room}_compare`] || 0),
          0
        );
        const diff = currentTotal - compareTotal;

        row[`P${room}_current`] = currentTotal;
        row[`P${room}_compare`] = compareTotal;
        row[`P${room}_diff`] = diff;
        row[`P${room}_percent`] = compareTotal ? (diff / compareTotal) * 100 : undefined;
      });

      return row;
    });
  };

  const renderNumber = (value?: number) => (value ? value : "");
  const renderComparisonNumber = (value?: number) => (typeof value === "number" ? value : "");

  const renderDiff = (value?: number) => {
    if (!value) {
      return "";
    }

    const className = value > 0 ? "text-green-600 dark:text-green-400" : "text-red-600";

    return <span className={className}>{value > 0 ? `+${value}` : value}</span>;
  };

  const renderPercent = (value?: number) => {
    if (typeof value !== "number") {
      return "";
    }

    const className = value > 0 ? "text-green-600 dark:text-green-400" : "text-red-600";

    return <span className={className}>{`${value > 0 ? "+" : ""}${value.toFixed(1)}%`}</span>;
  };

  const buildColumns = (rooms: string[]): ColumnsType<TreeRow> => {
    const roomCols = rooms.map((r) => ({
      title: `P${r}`,
      dataIndex: `P${r}`,
      key: `P${r}`,
      align: "right" as const,
      width: 80,
      render: renderNumber
    }));

    return [
      {
        title: "Hãng phim / Phim",
        dataIndex: "name",
        key: "name",
        fixed: "left",
        width: 350
      },
      {
        title: "Số buổi chiếu",
        children: roomCols
      }
    ];
  };

  const buildComparisonColumns = (
    rooms: string[],
    currentLabel: string,
    compareLabel: string
  ): ColumnsType<TreeRow> => {
    const roomCols = rooms.map((room) => ({
      title: `P${room}`,
      children: [
        {
          title: currentLabel,
          dataIndex: `P${room}_current`,
          key: `P${room}_current`,
          align: "right" as const,
          width: 100,
          render: renderComparisonNumber
        },
        {
          title: compareLabel,
          dataIndex: `P${room}_compare`,
          key: `P${room}_compare`,
          align: "right" as const,
          width: 100,
          render: renderComparisonNumber
        },
        {
          title: "+/-",
          dataIndex: `P${room}_diff`,
          key: `P${room}_diff`,
          align: "right" as const,
          width: 90,
          render: renderDiff
        },
        {
          title: "%",
          dataIndex: `P${room}_percent`,
          key: `P${room}_percent`,
          align: "right" as const,
          width: 110,
          render: renderPercent
        }
      ]
    }));

    return [
      {
        title: "Hãng phim / Phim",
        dataIndex: "name",
        key: "name",
        fixed: "left",
        width: 350
      },
      {
        title: "So sánh số buổi chiếu",
        children: roomCols
      }
    ];
  };

  const rooms = useMemo(() => {
    if (hasCompareDate) {
      return getAllRoomsForComparison(formatData?.data || [], compareFormatData?.data || []);
    }

    return getAllRooms(formatData?.data || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatData, compareFormatData, hasCompareDate]);

  const dataSource = useMemo(
    () =>
      hasCompareDate
        ? buildComparisonTreeTableData(formatData?.data || [], compareFormatData?.data || [], rooms)
        : buildTreeTableData(formatData?.data || [], rooms),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.data, compareData?.data, rooms, hasCompareDate]
  );

  const columns = useMemo(
    () =>
      hasCompareDate && filterValues.fromDate && filterValues.compareDate
        ? buildComparisonColumns(
            rooms,
            formatQuarterLabel(filterValues.fromDate),
            formatQuarterLabel(filterValues.compareDate)
          )
        : buildColumns(rooms),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rooms, hasCompareDate, filterValues.fromDate, filterValues.compareDate]
  );

  const isChartDataReady =
    hasFromDate &&
    !!formatData &&
    !isFetching &&
    (!hasCompareDate || (!!compareFormatData && !isCompareFetching));

  const items: TabsProps["items"] = [
    {
      key: "chart",
      label: "Biểu đồ",
      forceRender: true,
      children: hasFromDate ? (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <RoomScreeningChart
            data={dataSource}
            rooms={rooms}
            filterValues={filterValues}
            isReady={isChartDataReady}
          />
        </div>
      ) : (
        <DateRangeRequiredEmptyState description="Vui lòng chọn quý để xem biểu đồ" />
      )
    },
    {
      key: "detail",
      label: "Chi tiết",
      forceRender: true,
      children: hasFromDate ? (
        <div className="flex h-full min-h-0 flex-col">
          <TabRevenue
            tableData={dataSource}
            columns={columns}
            isFetching={isFetching || isCompareFetching}
          />
        </div>
      ) : (
        <DateRangeRequiredEmptyState description="Vui lòng chọn quý để xem báo cáo" />
      )
    }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Tabs
        items={items}
        defaultActiveKey="chart"
        className="flex h-full min-h-0 flex-col [&_.ant-tabs-content-holder]:min-h-0 [&_.ant-tabs-content-holder]:flex-1 [&_.ant-tabs-content]:h-full [&_.ant-tabs-content]:min-h-0 [&_.ant-tabs-tabpane]:h-full [&_.ant-tabs-tabpane]:min-h-0"
        tabBarExtraContent={
          <div className="mb-2 flex justify-end gap-3">
            {filterValues.fromDate && (
              <ExportRevenueExcelButton
                treeData={dataSource}
                rooms={rooms}
                fromDate={filterValues.fromDate}
                compareDate={filterValues.compareDate}
                loading={isFetching || isCompareFetching}
              />
            )}
          </div>
        }
      />
    </div>
  );
};

export default Tab1;
