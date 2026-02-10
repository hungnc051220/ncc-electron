"use client";

import { getVoucherUsage } from "@/data/loaders";
import { filterEmptyValues } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { TabsProps } from "antd";
import { Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useState } from "react";
import ExportRevenueExcelButton from "./export-excel";
import Filter from "./filter";
import TabRevenue from "./tab-revenue";
import { VoucherUsageProps } from "@/types";

export interface ValuesProps {
  userId?: number;
  userName?: string;
  dateRange: [string, string];
}
const Vouchers = () => {
  const [filterValues, setFilterValues] = useState<ValuesProps>({
    dateRange: [dayjs().startOf("day").format(), dayjs().endOf("day").format()],
  });

  const { data, isFetching } = useQuery({
    queryKey: ["voucher-usage", filterValues],
    queryFn: () => {
      const { dateRange, ...rest } = filterValues;
      const filtered = filterEmptyValues(rest as Record<string, unknown>);
      if (dateRange && dateRange.length === 2) {
        filtered.fromDate = dayjs(dateRange[0]).startOf("day").format();
        filtered.toDate = dayjs(dateRange[1]).endOf("day").format();
      }
      return getVoucherUsage({ ...filtered });
    },
  });

  const columns: ColumnsType<VoucherUsageProps> = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => index + 1,
      width: 50,
      fixed: "left",
    },
    {
      title: "Mã voucher",
      key: "voucherCode",
      dataIndex: "voucherCode",
    },
    {
      title: "Số vé",
      key: "numOrders",
      dataIndex: "numOrders",
    },
    {
      title: "Ngày in",
      key: "printedOnUtcDateOnly",
      dataIndex: "printedOnUtcDateOnly",
      render: (value) => dayjs(value, "YYYY-MM-DD").format("DD/MM/YYYY"),
    },
  ];

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Chi tiết",
      children: (
        <TabRevenue
          tableData={data?.voucherUsages || []}
          columns={columns}
          isFetching={isFetching}
          total={data?.totalOrders}
        />
      ),
    },
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
              tableData={data?.voucherUsages || []}
              fromDate={filterValues.dateRange[0]!}
              toDate={filterValues.dateRange[1]!}
              employeeName={filterValues?.userName}
              total={data?.totalOrders}
            />
          </div>
        }
      />
    </div>
  );
};

export default Vouchers;
