import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { usePaymentMethodRevenueReport } from "@renderer/hooks/reports/usePaymentMethodRevenueReport";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import type { PaymentMethodRevenueReportItem } from "@shared/types";
import type { TableProps } from "antd";
import { Table } from "antd";
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

const getElectronicTicketCount = (record: PaymentMethodRevenueReportItem) =>
  record.exportedTicketCount ??
  record.totalElectronicTicket ??
  record.totalElectronicTickets ??
  record.countOrder ??
  0;

type SummaryTotals = {
  electronicTicketCount: number;
  countOrder: number;
  totalChair: number;
  totalPrice: number;
};

const SoldTicketsPage = () => {
  const [filterValues, setFilterValues] = useState<FilterValues>(() => getDefaultFilterValues());

  const dto = useMemo(
    () => ({
      storeId: 0,
      fromDate: dayjs(filterValues.dateRange?.[0]).startOf("day").format(),
      toDate: dayjs(filterValues.dateRange?.[1]).endOf("day").format()
    }),
    [filterValues.dateRange]
  );

  const { data, isFetching } = usePaymentMethodRevenueReport(dto);
  const tableData = useMemo(() => data?.data || [], [data?.data]);

  const summary = useMemo(
    () =>
      tableData.reduce<SummaryTotals>(
        (total, item) => ({
          electronicTicketCount: total.electronicTicketCount + getElectronicTicketCount(item),
          countOrder: total.countOrder + (item.countOrder || 0),
          totalChair: total.totalChair + (item.totalChair || 0),
          totalPrice: total.totalPrice + (item.totalPrice || 0)
        }),
        {
          electronicTicketCount: 0,
          countOrder: 0,
          totalChair: 0,
          totalPrice: 0
        }
      ),
    [tableData]
  );

  const columns: TableProps<PaymentMethodRevenueReportItem>["columns"] = [
    {
      title: "STT",
      key: "index",
      align: "left",
      width: 50,
      render: (_, __, index) => index + 1
    },
    {
      title: "Cổng thanh toán",
      dataIndex: "sourceName",
      key: "sourceName",
      width: 260
    },
    {
      title: "Loại vé",
      dataIndex: "isOnline",
      key: "isOnline",
      width: 140,
      render: (value) => (value ? "Online" : "Offline")
    },
    {
      title: "Số lượng vé điện tử đã xuất",
      key: "electronicTicketCount",
      align: "right",
      width: 220,
      render: (_, record) => formatNumber(getElectronicTicketCount(record))
    },
    {
      title: "Số lượng vé đã bán",
      dataIndex: "countOrder",
      key: "countOrder",
      align: "right",
      width: 180,
      render: (value) => formatNumber(value || 0)
    },
    {
      title: "Số lượng ghế đã bán",
      dataIndex: "totalChair",
      key: "totalChair",
      align: "right",
      width: 180,
      render: (value) => formatNumber(value || 0)
    },
    {
      title: "Tổng tiền thanh toán",
      dataIndex: "totalPrice",
      key: "totalPrice",
      align: "right",
      width: 200,
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
          </>
        }
      />

      <AutoHeightTable
        rowKey={(record, index) =>
          `${record.paymentMethodSystemName || record.sourceName || record.name || "payment"}-${
            record.terminalId ?? index
          }-${index}`
        }
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
                    <Table.Summary.Cell index={0} colSpan={3} align="center" className="font-bold">
                      Tổng
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right" className="font-bold">
                      {formatNumber(summary.electronicTicketCount)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right" className="font-bold">
                      {formatNumber(summary.countOrder)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right" className="font-bold">
                      {formatNumber(summary.totalChair)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="right" className="font-bold">
                      {formatNumber(summary.totalPrice)}
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

export default SoldTicketsPage;
