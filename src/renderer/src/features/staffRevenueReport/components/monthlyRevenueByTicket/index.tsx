import { useReportRevenueDayInMonth } from "@renderer/hooks/reports/useReportRevenueDayInMonth";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { RevenuesByDayProps } from "@shared/types";
import type { TabsProps } from "antd";
import { Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useState } from "react";
import ExportRevenueExcelButton from "./ExportExcel";
import Filter from "./Filter";
import TabRevenue from "./TabRevenue";

export interface ValuesProps {
  userId?: number;
  userName?: string;
  manufacturerId?: number;
  filmId?: number;
  fromDate: string;
}

export interface Row {
  key: React.Key;
  projectDate: string;
  isOnline: string;
  totalQuantity: number;
  totalSale: number;
  [price: number]: number | string;
}

const MonthlyRevenueByTicket = () => {
  const [filterValues, setFilterValues] = useState<ValuesProps>({
    fromDate: dayjs().startOf("month").format("YYYY-MM-DD")
  });

  const { data, isFetching } = useReportRevenueDayInMonth({ ...filterValues });

  const buildColumns = (): ColumnsType<Row> => {
    return [
      {
        title: "Ngày",
        dataIndex: "projectDate",
        fixed: "left",
        width: 120,
        render: (v: string) => dayjs(v).format("DD/MM/YYYY")
      },
      {
        title: "Loại",
        dataIndex: "isOnline",
        fixed: "left",
        width: 100
      },
      {
        title: "Tổng vé",
        dataIndex: "totalQuantity",
        align: "right",
        width: 100,
        render: (v: number) => formatNumber(v),
        fixed: "right"
      },
      {
        title: "Doanh thu",
        dataIndex: "totalSale",
        align: "right",
        width: 140,
        render: (v: number) => formatMoney(v),
        fixed: "right"
      }
    ];
  };

  const buildDataSource = (revenuesByDay: RevenuesByDayProps[]) => {
    return revenuesByDay.map((item, index) => {
      const priceMap: Record<number, number> = {};

      item.prices.forEach((p) => {
        priceMap[p.price] = p.totalQuantity;
      });

      return {
        key: index,
        projectDate: item.projectDate,
        isOnline: item.isOnline ? "Online" : "Offline",
        totalQuantity: item.totalQuantity,
        totalSale: item.totalSale,
        ...priceMap
      };
    });
  };

  const columns = buildColumns();
  const dataSource = buildDataSource(data?.revenuesByDay || []);

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Chi tiết",
      children: (
        <TabRevenue tableData={dataSource} columns={columns} isFetching={isFetching} data={data} />
      )
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
              tableData={dataSource}
              data={data}
              fromDate={filterValues.fromDate}
              employeeName={filterValues?.userName}
            />
          </div>
        }
      />
    </div>
  );
};

export default MonthlyRevenueByTicket;
