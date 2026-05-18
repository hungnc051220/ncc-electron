import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import { useDiscountOfflineUsageReport } from "@renderer/hooks/reports/useDiscountOfflineUsageReport";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import type { DiscountOfflineUsageReportItem } from "@shared/types";
import { Table, type TableProps } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import ExportExcelButton from "./components/ExportExcel";
import Filter from "./components/Filter";

export type FilterValues = {
  dateRange?: [string, string];
};

export const getDefaultFilterValues = (): FilterValues => ({
  dateRange: [dayjs().startOf("day").format(), dayjs().endOf("day").format()]
});

type SummaryTotals = {
  countOrder: number;
  countQuantity: number;
  countDiscountAmount: number;
  countPriceInclTax: number;
};

const DiscountOfflineUsagePage = () => {
  const [filterValues, setFilterValues] = useState<FilterValues>(() => getDefaultFilterValues());

  const dto = useMemo(
    () => ({
      storeId: 0,
      fromDate: dayjs(filterValues.dateRange?.[0]).startOf("day").format(),
      toDate: dayjs(filterValues.dateRange?.[1]).endOf("day").format()
    }),
    [filterValues.dateRange]
  );

  const { data, isFetching, refetch } = useDiscountOfflineUsageReport(dto);
  const tableData = useMemo(() => data?.data || [], [data?.data]);

  const summary = useMemo(
    () =>
      tableData.reduce<SummaryTotals>(
        (total, item) => ({
          countOrder: total.countOrder + (item.totalOrders || 0),
          countQuantity: total.countQuantity + (item.totalQuantity || 0),
          countDiscountAmount: total.countDiscountAmount + (item.totalDiscountAmount || 0),
          countPriceInclTax: total.countPriceInclTax + (item.totalPriceInclTax || 0)
        }),
        {
          countOrder: 0,
          countQuantity: 0,
          countDiscountAmount: 0,
          countPriceInclTax: 0
        }
      ),
    [tableData]
  );

  const columns: TableProps<DiscountOfflineUsageReportItem>["columns"] = [
    {
      title: "STT",
      key: "index",
      align: "left",
      width: 50,
      render: (_, __, index) => index + 1
    },
    {
      title: "Khuyến mại, giảm giá",
      dataIndex: "discountName",
      key: "discountName"
    },
    {
      title: "Số đơn áp dụng",
      dataIndex: "totalOrders",
      key: "totalOrders",
      align: "right",
      width: 180,
      render: (value) => formatNumber(value || 0)
    },
    {
      title: "Số vé áp dụng",
      dataIndex: "totalQuantity",
      key: "totalQuantity",
      align: "right",
      width: 180,
      render: (value) => formatNumber(value || 0)
    },
    {
      title: "Tổng tiền khuyến mại, giảm giá",
      dataIndex: "totalDiscountAmount",
      key: "totalDiscountAmount",
      align: "right",
      width: 250,
      render: (value) => formatMoney(value || 0)
    },
    {
      title: "Tổng doanh thu",
      dataIndex: "totalPriceInclTax",
      key: "totalPriceInclTax",
      align: "right",
      width: 180,
      render: (value) => formatMoney(value || 0)
    }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4 pb-3">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          <>
            <ExportExcelButton
              tableData={tableData}
              dateRange={filterValues.dateRange}
              loading={isFetching}
            />
            <Filter filterValues={filterValues} onSearch={setFilterValues} />
            <RefreshButton loading={isFetching} onRefresh={() => refetch()} />
          </>
        }
      />

      <AutoHeightTable
        rowKey="discountId"
        dataSource={tableData}
        columns={columns}
        bordered
        loading={isFetching}
        pagination={false}
        size="small"
        summary={
          tableData.length > 0
            ? () => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={2} align="center" className="font-bold">
                      Tổng
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right" className="font-bold">
                      {formatNumber(summary.countOrder)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right" className="font-bold">
                      {formatNumber(summary.countQuantity)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right" className="font-bold">
                      {formatMoney(summary.countDiscountAmount)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right" className="font-bold">
                      {formatMoney(summary.countPriceInclTax)}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )
            : undefined
        }
      />
    </div>
  );
};

export default DiscountOfflineUsagePage;
