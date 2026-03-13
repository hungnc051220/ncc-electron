import { useReportYearly } from "@renderer/hooks/reports/useReportYearly";
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
  fromDate: string;
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
  const [filterValues, setFilterValues] = useState<ValuesProps>({
    fromDate: dayjs().startOf("year").format()
  });

  const params = useMemo(
    () => ({
      year: dayjs(filterValues.fromDate).year(),
      reportType: "SUMMARY" as const
    }),
    [filterValues.fromDate]
  );

  const { data, isFetching } = useReportYearly(params);
  const tableData = useMemo(() => normalizeYearlySummaryData(data), [data]);

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Chi tiết",
      children: <TabRevenue tableData={tableData} columns={columns} isFetching={isFetching} />
    }
  ];

  return (
    <div className="pb-6">
      <Tabs
        items={items}
        defaultActiveKey="1"
        type="card"
        size="small"
        tabBarExtraContent={
          <div className="mb-2 flex justify-end gap-3">
            <Filter filterValues={filterValues} onSearch={setFilterValues} />
            <ExportRevenueExcelButton tableData={tableData} year={params.year} />
          </div>
        }
      />
    </div>
  );
};

export default Tab4;
