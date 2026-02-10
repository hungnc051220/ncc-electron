"use client";

import type { TabsProps } from "antd";
import { Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import ExportRevenueExcelButton from "./ExportExcel";
import Filter from "./Filter";
import TabRevenue from "./TabRevenue";
import { U22UsageProps } from "@renderer/types";
import { filterEmptyValues, formatMoney } from "@renderer/lib/utils";
import { useReportU22Usage } from "@renderer/hooks/reports/useReportU22Usage";

export interface ValuesProps {
  userId?: number;
  userName?: string;
  dateRange: [string, string];
}
const U22Usage = () => {
  const [filterValues, setFilterValues] = useState<ValuesProps>({
    dateRange: [dayjs().startOf("day").format(), dayjs().endOf("day").format()]
  });

  const params = useMemo(() => {
    const { dateRange, ...rest } = filterValues;
    const filtered = filterEmptyValues(rest as Record<string, unknown>);

    if (dateRange && dateRange.length === 2) {
      filtered.fromDate = dayjs(dateRange[0]).startOf("day").format();
      filtered.toDate = dayjs(dateRange[1]).endOf("day").format();
    }

    return filtered;
  }, [filterValues]);

  const { data, isFetching } = useReportU22Usage(params);

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
      render: (value) => dayjs(value).format("HH:mm DD/MM/YYYY")
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
      children: (
        <TabRevenue
          tableData={data?.data || []}
          columns={columns}
          isFetching={isFetching}
          totalOrders={data?.totalUsage.totalOrders}
          totalAmount={data?.totalUsage.totalAmount}
        />
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
              tableData={data?.data || []}
              fromDate={filterValues.dateRange[0]!}
              toDate={filterValues.dateRange[1]!}
              employeeName={filterValues?.userName}
              totalOrders={data?.totalUsage.totalOrders}
              totalAmount={data?.totalUsage.totalAmount}
            />
          </div>
        }
      />
    </div>
  );
};

export default U22Usage;
