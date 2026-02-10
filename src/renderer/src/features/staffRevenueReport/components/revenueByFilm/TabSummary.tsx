"use client";

import { Table } from "antd";
import { Row, SummaryGroup } from ".";
import type { TableProps } from "antd";
import dayjs from "dayjs";
import { formatMoney, formatNumber } from "@renderer/lib/utils";

export type SummaryRow = {
  key: string;
  projectDate: string;
  isOnline: boolean;
  pricesMap: Record<number, number>;
  totalQuantity: number;
  totalInvitationQuantity: number;
  totalContractQuantity: number;
  totalSale: number;
  saleVnPayQr: number;
  saleVietQr: number;
  actualSale: number;
};

interface TabSummaryProps {
  summaryByDate: Record<string, SummaryGroup>;
  isFetching: boolean;
  priceColumns: TableProps<SummaryRow>["columns"];
}

const TabSummary = ({ summaryByDate, isFetching, priceColumns }: TabSummaryProps) => {
  const sumGroup = (rows: Row[]) => {
    const prices: Record<number, number> = {};
    let totalQuantity = 0;
    let totalInvitationQuantity = 0;
    let totalContractQuantity = 0;
    let totalSale = 0;
    let saleVnPayQr = 0;
    let saleVietQr = 0;
    let actualSale = 0;

    rows.forEach((r) => {
      totalQuantity += r.totalQuantity;
      totalInvitationQuantity += r.totalInvitationQuantity;
      totalContractQuantity += r.totalContractQuantity;
      totalSale += r.totalSale;
      saleVnPayQr += r.saleVnPayQr;
      saleVietQr += r.saleVietQr;
      actualSale += r.actualSale;

      Object.entries(r.pricesMap).forEach(([price, qty]) => {
        const p = Number(price);
        prices[p] = (prices[p] ?? 0) + qty;
      });
    });

    return {
      prices,
      totalQuantity,
      totalInvitationQuantity,
      totalContractQuantity,
      totalSale,
      saleVnPayQr,
      saleVietQr,
      actualSale
    };
  };

  const tableData: SummaryRow[] = [];

  Object.entries(summaryByDate).forEach(([date, group]) => {
    const offSum = sumGroup(group.off);
    const onSum = sumGroup(group.on);

    tableData.push({
      key: `${date}-off`,
      projectDate: date,
      isOnline: false,
      pricesMap: offSum.prices,
      totalQuantity: offSum.totalQuantity,
      totalInvitationQuantity: offSum.totalInvitationQuantity,
      totalContractQuantity: offSum.totalContractQuantity,
      totalSale: offSum.totalSale,
      saleVnPayQr: offSum.saleVnPayQr,
      saleVietQr: offSum.saleVietQr,
      actualSale: offSum.actualSale
    });

    tableData.push({
      key: `${date}-on`,
      projectDate: date,
      isOnline: true,
      pricesMap: onSum.prices,
      totalQuantity: onSum.totalQuantity,
      totalInvitationQuantity: onSum.totalInvitationQuantity,
      totalContractQuantity: onSum.totalContractQuantity,
      totalSale: onSum.totalSale,
      saleVnPayQr: onSum.saleVnPayQr,
      saleVietQr: onSum.saleVietQr,
      actualSale: onSum.actualSale
    });
  });

  const columns: TableProps<SummaryRow>["columns"] = [
    {
      title: "Ngày",
      key: "projectDate",
      dataIndex: "projectDate",
      width: 110,
      render: (value: string) => dayjs(value, "YYYY-MM-DD").format("DD/MM/YYYY"),
      fixed: "left"
    },
    {
      title: "Loại",
      key: "isOnline",
      dataIndex: "isOnline",
      width: 60,
      render: (value: boolean) => (value ? "On" : "Off"),
      fixed: "left"
    },
    {
      title: "Loại giá vé (Đơn vị tính: 1.000 đồng)",
      children: priceColumns
    },
    {
      title: "Tổng",
      key: "totalQuantity",
      dataIndex: "totalQuantity",
      align: "right",
      render: (value: number) => formatNumber(value)
    },
    {
      title: "Giấy mời",
      key: "totalInvitationQuantity",
      dataIndex: "totalInvitationQuantity",
      render: (value: number) => formatNumber(value),
      align: "right"
    },
    {
      title: "Hợp đồng",
      key: "totalContractQuantity",
      dataIndex: "totalContractQuantity",
      render: (value: number) => formatNumber(value),
      align: "right"
    },
    {
      title: "Thành tiền",
      key: "totalSale",
      dataIndex: "totalSale",
      render: (value: number) => formatMoney(value),
      align: "right",
      width: 150
    },
    {
      title: "Tiền VNPayQR",
      key: "saleVnPayQr",
      dataIndex: "saleVnPayQr",
      render: (value: number) => formatMoney(value),
      align: "right",
      width: 150
    },
    {
      title: "Tiền VietQR",
      key: "saleVietQr",
      dataIndex: "saleVietQr",
      render: (value: number) => formatMoney(value),
      align: "right",
      width: 150
    },
    {
      title: "Thực nộp",
      key: "actualSale",
      dataIndex: "actualSale",
      render: (value: number) => formatMoney(value),
      align: "right",
      width: 150
    }
  ];

  return (
    <Table
      dataSource={tableData}
      columns={columns}
      bordered
      size="small"
      scroll={{ x: "max-content", y: "calc(100vh - 375px)" }}
      loading={isFetching}
      pagination={false}
    />
  );
};

export default TabSummary;
