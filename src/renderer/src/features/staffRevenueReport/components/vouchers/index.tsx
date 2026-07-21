import { useReportVoucherUsage } from "@renderer/hooks/reports/useReportVoucherUsage";
import RefreshButton from "@renderer/components/RefreshButton";
import { filterEmptyValues } from "@renderer/lib/utils";
import { VoucherUsageProps } from "@shared/types";
import FullHeightTabs from "@renderer/components/FullHeightTabs";
import type { TabsProps } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import DateRangeRequiredEmptyState from "../DateRangeRequiredEmptyState";
import ExportRevenueExcelButton from "./ExportExcel";
import Filter from "./Filter";
import TabRevenue from "./TabRevenue";

export interface ValuesProps {
  userId?: number;
  userName?: string;
  dateRange?: [string, string];
}
const Vouchers = () => {
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
  const { data, isFetching, refetch } = useReportVoucherUsage(params, hasDateRange);
  const reportData = hasDateRange ? data : undefined;

  const columns: ColumnsType<VoucherUsageProps> = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Mã voucher",
      key: "voucherCode",
      dataIndex: "voucherCode"
    },
    {
      title: "Số vé",
      key: "numOrders",
      dataIndex: "numOrders"
    },
    {
      title: "Ngày in",
      key: "printedOnUtcDateOnly",
      dataIndex: "printedOnUtcDateOnly",
      render: (value) => dayjs(value, "YYYY-MM-DD").format("DD/MM/YYYY")
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
            tableData={reportData?.voucherUsages || []}
            columns={columns}
            isFetching={isFetching}
            total={reportData?.totalOrders}
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
      <FullHeightTabs
        items={items}
        defaultActiveKey="1"
        tabBarExtraContent={
          <div className="flex justify-end gap-3 mr-2">
            <Filter filterValues={filterValues} onSearch={onSearch} />
            <RefreshButton
              disabled={!hasDateRange}
              loading={isFetching}
              onRefresh={() => refetch()}
            />
            {filterValues.dateRange?.length === 2 && (
              <ExportRevenueExcelButton
                tableData={reportData?.voucherUsages || []}
                fromDate={filterValues.dateRange[0]}
                toDate={filterValues.dateRange[1]}
                employeeName={filterValues?.userName}
                total={reportData?.totalOrders}
              />
            )}
          </div>
        }
      />
    </div>
  );
};

export default Vouchers;
