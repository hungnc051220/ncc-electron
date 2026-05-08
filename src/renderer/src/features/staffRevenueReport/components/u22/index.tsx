import type { TabsProps } from "antd";
import { Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import DateRangeRequiredEmptyState from "../DateRangeRequiredEmptyState";
import ExportRevenueExcelButton from "./ExportExcel";
import Filter from "./Filter";
import TabRevenue from "./TabRevenue";
import { U22UsageProps } from "@shared/types";
import { filterEmptyValues, formatMoney } from "@renderer/lib/utils";
import { useReportU22Usage } from "@renderer/hooks/reports/useReportU22Usage";

export interface ValuesProps {
  userId?: number;
  userName?: string;
  dateRange?: [string, string];
}
const U22Usage = () => {
  const [filterValues, setFilterValues] = useState<ValuesProps>({});

  const params = useMemo(() => {
    const { dateRange, ...rest } = filterValues;
    const filtered = filterEmptyValues(rest as Record<string, unknown>);

    if (dateRange && dateRange.length === 2) {
      filtered.fromDate = dayjs(dateRange[0]).startOf("day").format();
      filtered.toDate = dayjs(dateRange[1]).endOf("day").format();
    }

    return filtered;
  }, [filterValues]);

  const hasDateRange = filterValues.dateRange?.length === 2;
  const { data, isFetching } = useReportU22Usage(params, hasDateRange);
  const reportData = hasDateRange ? data : undefined;

  const columns: ColumnsType<U22UsageProps> = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Tên khách hàng",
      key: "fullName",
      dataIndex: "fullName"
    },
    {
      title: "Số thẻ",
      key: "memberCardCode",
      dataIndex: "memberCardCode"
    },
    {
      title: "Thời gian mua",
      key: "paidDate",
      dataIndex: "paidDate",
      render: (value) => (value ? dayjs(value).format("HH:mm DD/MM/YYYY") : "")
    },
    {
      title: "Mức chi tiêu",
      children: [
        {
          title: "Số vé",
          key: "numOrders",
          dataIndex: "numOrders",
          align: "right",
          width: 200
        },
        {
          title: "Thành tiền",
          key: "totalAmount",
          dataIndex: "totalAmount",
          align: "right",
          width: 200,
          render: (value) => formatMoney(value)
        }
      ]
    }
  ];

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Chi tiết",
      forceRender: true,
      children: hasDateRange ? (
        <div className="flex h-full min-h-0 flex-col">
          <TabRevenue
            tableData={reportData?.data || []}
            columns={columns}
            isFetching={isFetching}
            totalOrders={reportData?.totalUsage.totalOrders}
            totalAmount={reportData?.totalUsage.totalAmount}
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
          <div className="flex justify-end gap-3 mr-2">
            <Filter filterValues={filterValues} onSearch={onSearch} />
            {filterValues.dateRange?.length === 2 && (
              <ExportRevenueExcelButton
                tableData={reportData?.data || []}
                fromDate={filterValues.dateRange[0]}
                toDate={filterValues.dateRange[1]}
                employeeName={filterValues?.userName}
                totalOrders={reportData?.totalUsage.totalOrders}
                totalAmount={reportData?.totalUsage.totalAmount}
              />
            )}
          </div>
        }
      />
    </div>
  );
};

export default U22Usage;
