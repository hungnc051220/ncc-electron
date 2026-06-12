import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import { useDiscountOfflineUsageReport } from "@renderer/hooks/reports/useDiscountOfflineUsageReport";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import type { DiscountOfflineUsageReportItem } from "@shared/types";
import { Table, Tabs, type TableProps, type TabsProps } from "antd";
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

type ReportType = "promotion" | "discount";

const buildSummary = (tableData: DiscountOfflineUsageReportItem[]) =>
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
  );

const DiscountOfflineUsagePage = () => {
  const [filterValues, setFilterValues] = useState<FilterValues>(() => getDefaultFilterValues());
  const [activeReportType, setActiveReportType] = useState<ReportType>("promotion");

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

  const reportData = useMemo<Record<ReportType, DiscountOfflineUsageReportItem[]>>(
    () => ({
      promotion: tableData.filter((item) => item.promotionType === 2),
      discount: tableData.filter((item) => item.promotionType === 1)
    }),
    [tableData]
  );

  const summaries = useMemo<Record<ReportType, SummaryTotals>>(
    () => ({
      promotion: buildSummary(reportData.promotion),
      discount: buildSummary(reportData.discount)
    }),
    [reportData]
  );

  const getColumns = (
    reportType: ReportType
  ): TableProps<DiscountOfflineUsageReportItem>["columns"] => {
    const reportLabel = reportType === "promotion" ? "khuyến mãi" : "giảm giá";

    return [
      {
        title: "STT",
        key: "index",
        align: "left",
        width: 50,
        render: (_, __, index) => index + 1
      },
      {
        title: `Chương trình ${reportLabel}`,
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
        title: `Tổng tiền ${reportLabel}`,
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
  };

  const renderReportTable = (reportType: ReportType) => {
    const currentTableData = reportData[reportType];
    const currentSummary = summaries[reportType];

    return (
      <AutoHeightTable
        rowKey="discountId"
        dataSource={currentTableData}
        columns={getColumns(reportType)}
        bordered
        loading={isFetching}
        pagination={false}
        size="small"
        summary={
          currentTableData.length > 0
            ? () => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={2} align="center" className="font-bold">
                      Tổng
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right" className="font-bold">
                      {formatNumber(currentSummary.countOrder)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right" className="font-bold">
                      {formatNumber(currentSummary.countQuantity)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right" className="font-bold">
                      {formatMoney(currentSummary.countDiscountAmount)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right" className="font-bold">
                      {formatMoney(currentSummary.countPriceInclTax)}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )
            : undefined
        }
      />
    );
  };

  const tabItems: TabsProps["items"] = [
    {
      key: "promotion",
      label: "Doanh thu theo chương trình khuyến mãi",
      children: <div className="flex h-full min-h-0 flex-col">{renderReportTable("promotion")}</div>
    },
    {
      key: "discount",
      label: "Doanh thu theo chương trình giảm giá",
      children: <div className="flex h-full min-h-0 flex-col">{renderReportTable("discount")}</div>
    }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4 pb-3">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          <>
            <ExportExcelButton
              tableData={reportData[activeReportType]}
              dateRange={filterValues.dateRange}
              loading={isFetching}
            />
            <Filter filterValues={filterValues} onSearch={setFilterValues} />
            <RefreshButton loading={isFetching} onRefresh={() => refetch()} />
          </>
        }
      />

      <Tabs
        type="card"
        activeKey={activeReportType}
        onChange={(key) => setActiveReportType(key as ReportType)}
        items={tabItems}
        className="flex h-full min-h-0 flex-col [&_.ant-tabs-content-holder]:min-h-0 [&_.ant-tabs-content-holder]:flex-1 [&_.ant-tabs-content]:h-full [&_.ant-tabs-content]:min-h-0 [&_.ant-tabs-tabpane]:h-full [&_.ant-tabs-tabpane]:min-h-0"
      />
    </div>
  );
};

export default DiscountOfflineUsagePage;
