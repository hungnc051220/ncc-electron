import { useReportMonthly } from "@renderer/hooks/reports/useReportMonthly";
import { Film, Manufacturer, MonthlyReportPlanProps } from "@shared/types";
import type { TabsProps } from "antd";
import { Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import DateRangeRequiredEmptyState from "@renderer/features/staffRevenueReport/components/DateRangeRequiredEmptyState";
import RefreshButton from "@renderer/components/RefreshButton";
import ExportRevenueExcelButton from "./ExportExcel";
import Filter from "./Filter";
import TabRevenue from "./TabRevenue";

export interface ValuesProps {
  fromDate?: string;
}

export interface TreeRow {
  key: string;
  name: string;
  isSummary?: boolean;
  [key: string]: string | number | TreeRow[] | boolean | undefined;
  children?: TreeRow[];
}

const Tab1 = () => {
  const [filterValues, setFilterValues] = useState<ValuesProps>({});

  const hasFromDate = !!filterValues.fromDate;
  const { data, isFetching, refetch } = useReportMonthly(
    { ...filterValues, reportType: "PLAN" },
    hasFromDate
  );
  const formatData = (hasFromDate ? data : undefined) as MonthlyReportPlanProps | undefined;

  const getAllRooms = (data: Manufacturer[]) => {
    const set = new Set<string>();
    data.forEach((m) => m.films.forEach((f) => f.rooms.forEach((r) => set.add(r.roomName))));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
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

  const buildColumns = (rooms: string[]): ColumnsType<TreeRow> => {
    const roomCols = rooms.map((r) => ({
      title: `P${r}`,
      dataIndex: `P${r}`,
      key: `P${r}`,
      align: "center" as const,
      width: 80,
      render: (v: number) => v || ""
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

  const rooms = useMemo(() => getAllRooms(formatData?.data || []), [formatData?.data]);

  const dataSource = useMemo(
    () => buildTreeTableData(formatData?.data || [], rooms),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.data, rooms]
  );

  const columns = useMemo(() => buildColumns(rooms), [rooms]);

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Chi tiết",
      forceRender: true,
      children: hasFromDate ? (
        <div className="flex h-full min-h-0 flex-col">
          <TabRevenue tableData={dataSource} columns={columns} isFetching={isFetching} />
        </div>
      ) : (
        <DateRangeRequiredEmptyState description="Vui lòng chọn tháng để xem báo cáo" />
      )
    }
  ];

  const onSearch = (values: ValuesProps) => {
    setFilterValues(values.fromDate ? values : {});
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Tabs
        items={items}
        defaultActiveKey="1"
        className="flex h-full min-h-0 flex-col [&_.ant-tabs-content-holder]:min-h-0 [&_.ant-tabs-content-holder]:flex-1 [&_.ant-tabs-content]:h-full [&_.ant-tabs-content]:min-h-0 [&_.ant-tabs-tabpane]:h-full [&_.ant-tabs-tabpane]:min-h-0"
        tabBarExtraContent={
          <div className="flex justify-end gap-3">
            <Filter filterValues={filterValues} onSearch={onSearch} />
            <RefreshButton
              disabled={!hasFromDate}
              loading={isFetching}
              onRefresh={() => refetch()}
            />
            {filterValues.fromDate && (
              <ExportRevenueExcelButton
                treeData={dataSource}
                rooms={rooms}
                fromDate={filterValues.fromDate}
              />
            )}
          </div>
        }
      />
    </div>
  );
};

export default Tab1;
