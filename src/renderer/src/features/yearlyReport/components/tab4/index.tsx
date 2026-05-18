import { useReportYearly } from "@renderer/hooks/reports/useReportYearly";
import RefreshButton from "@renderer/components/RefreshButton";
import DateRangeRequiredEmptyState from "@renderer/features/staffRevenueReport/components/DateRangeRequiredEmptyState";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { YearlyReportSummaryItem } from "@shared/types";
import type { TabsProps } from "antd";
import { Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import ExportRevenueExcelButton from "./ExportExcel";
import Filter from "./Filter";
import TabRevenue from "./TabRevenue";
import { normalizeYearlySummaryData } from "../yearlyReport.utils";

export interface ValuesProps {
  fromDate?: string;
}

const columns: ColumnsType<YearlyReportSummaryItem> = [
  {
    title: "Đơn vị phát hành",
    dataIndex: "manufacturerName",
    key: "manufacturerName",
    width: 320,
    fixed: "left"
  },
  {
    title: "Tổng phim",
    dataIndex: "totalFilms",
    key: "totalFilms",
    width: 120,
    align: "right",
    render: (value: number) => formatNumber(value || 0)
  },
  {
    title: "Tổng buổi chiếu",
    dataIndex: "totalPlans",
    key: "totalPlans",
    width: 140,
    align: "right",
    render: (value: number) => formatNumber(value || 0)
  },
  {
    title: "Tổng khán giả",
    dataIndex: "totalTicketsSold",
    key: "totalTicketsSold",
    width: 140,
    align: "right",
    render: (value: number) => formatNumber(value || 0)
  },
  {
    title: "Tổng doanh thu",
    dataIndex: "totalRevenue",
    key: "totalRevenue",
    width: 160,
    align: "right",
    render: (value: number) => formatMoney(value || 0)
  },
  {
    title: "DT chia sẻ",
    dataIndex: "totalSharedRevenue",
    key: "totalSharedRevenue",
    width: 160,
    align: "right",
    render: (value: number) => formatMoney(value || 0)
  }
];

const Tab4 = () => {
  const [filterValues, setFilterValues] = useState<ValuesProps>({});
  const hasFromDate = !!filterValues.fromDate;

  const params = useMemo(
    () => ({
      year: filterValues.fromDate ? dayjs(filterValues.fromDate).year() : 0,
      reportType: "SUMMARY" as const
    }),
    [filterValues.fromDate]
  );

  const { data, isFetching, refetch } = useReportYearly(params, hasFromDate);
  const tableData = useMemo(
    () => normalizeYearlySummaryData(hasFromDate ? data : undefined),
    [data, hasFromDate]
  );

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Chi tiết",
      forceRender: true,
      children: hasFromDate ? (
        <div className="flex h-full min-h-0 flex-col">
          <TabRevenue tableData={tableData} columns={columns} isFetching={isFetching} />
        </div>
      ) : (
        <DateRangeRequiredEmptyState description="Vui lòng chọn năm để xem báo cáo" />
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
              <ExportRevenueExcelButton tableData={tableData} year={params.year} />
            )}
          </div>
        }
      />
    </div>
  );
};

export default Tab4;
