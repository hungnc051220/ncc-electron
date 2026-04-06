import { useReportRevenueDayInMonth } from "@renderer/hooks/reports/useReportRevenueDayInMonth";
import { filterEmptyValues } from "@renderer/lib/utils";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { RevenuesByDayProps } from "@shared/types";
import type { TabsProps } from "antd";
import { Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useState } from "react";
import DateRangeRequiredEmptyState from "../DateRangeRequiredEmptyState";
import ExportRevenueExcelButton from "./ExportExcel";
import Filter from "./Filter";
import TabRevenue from "./TabRevenue";

export interface ValuesProps {
  userId?: number;
  userName?: string;
  manufacturerId?: number;
  filmId?: number;
  dateRange?: [string, string];
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
  const [filterValues, setFilterValues] = useState<ValuesProps>({});

  const params = {
    ...filterEmptyValues({
      userId: filterValues.userId,
      manufacturerId: filterValues.manufacturerId,
      filmId: filterValues.filmId
    } as Record<string, unknown>),
    ...(filterValues.dateRange?.length === 2
      ? {
          fromDate: dayjs(filterValues.dateRange[0]).startOf("day").format(),
          toDate: dayjs(filterValues.dateRange[1]).endOf("day").format()
        }
      : {})
  };

  const hasDateRange = filterValues.dateRange?.length === 2;
  const { data, isFetching } = useReportRevenueDayInMonth(params, hasDateRange);
  const reportData = hasDateRange ? data : undefined;

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
  const dataSource = buildDataSource(reportData?.revenuesByDay || []);

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Chi tiết",
      forceRender: true,
      children: hasDateRange ? (
        <div className="flex h-full min-h-0 flex-col">
          <TabRevenue
            tableData={dataSource}
            columns={columns}
            isFetching={isFetching}
            data={reportData}
          />
        </div>
      ) : (
        <DateRangeRequiredEmptyState />
      )
    }
  ];

  const onSearch = (values: ValuesProps) => {
    setFilterValues(filterEmptyValues(values as Record<string, unknown>) as ValuesProps);
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
            {filterValues.dateRange?.length === 2 && (
              <ExportRevenueExcelButton
                tableData={dataSource}
                data={reportData}
                fromDate={filterValues.dateRange[0]}
                employeeName={filterValues?.userName}
              />
            )}
          </div>
        }
      />
    </div>
  );
};

export default MonthlyRevenueByTicket;
