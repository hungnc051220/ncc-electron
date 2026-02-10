"use client";

import { useReportQuarterly } from "@renderer/hooks/reports/useReportQuarterly";
import { Film, Manufacturer, MonthlyReportPlanProps } from "@renderer/types";
import type { TabsProps } from "antd";
import { Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import ExportRevenueExcelButton from "./ExportExcel";
import Filter from "./Filter";
import TabRevenue from "./TabRevenue";

export interface ValuesProps {
  fromDate: string;
}

export interface TreeRow {
  key: string;
  name: string;
  isSummary?: boolean;
  [key: string]: string | number | TreeRow[] | boolean | undefined;
  children?: TreeRow[];
}

const Tab1 = () => {
  const [filterValues, setFilterValues] = useState<ValuesProps>({
    fromDate: dayjs().startOf("quarter").format()
  });

  const params = useMemo(() => {
    const { fromDate } = filterValues;
    const payload = {
      year: dayjs(fromDate).year(),
      quarter: dayjs(fromDate).quarter(),
      reportType: "PLAN"
    };
    return payload;
  }, [filterValues]);

  const { data, isFetching } = useReportQuarterly(params);
  const formatData = data as MonthlyReportPlanProps;

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

  const rooms = useMemo(() => getAllRooms(formatData?.data || []), [formatData]);

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
      children: <TabRevenue tableData={dataSource} columns={columns} isFetching={isFetching} />
    }
  ];

  const onSearch = (values: ValuesProps) => {
    setFilterValues(values);
  };

  return (
    <div className="pb-6">
      <Tabs
        items={items}
        defaultActiveKey="1"
        type="card"
        size="small"
        tabBarExtraContent={
          <div className="flex justify-end mb-2 gap-3">
            <Filter filterValues={filterValues} onSearch={onSearch} />
            <ExportRevenueExcelButton
              treeData={dataSource}
              rooms={rooms}
              fromDate={filterValues.fromDate!}
            />
          </div>
        }
      />
    </div>
  );
};

export default Tab1;
