import AutoHeightTable from "@renderer/components/AutoHeightTable";
import { TotalRevenueOnlineProps, TotalRevenueProps } from "@shared/types";
import { Table } from "antd";
import { Row, SummaryGroup } from ".";
import type { TableProps } from "antd";
import dayjs from "dayjs";
import { formatMoney, formatNumber } from "@renderer/lib/utils";

export type SummaryRow = {
  key: string;
  projectDate: string;
  isOnline: boolean;
  totalPlanScreen: number;
  pricesMap: Record<number, number>;
  totalQuantity: number;
  totalInvitationQuantity: number;
  totalContractQuantity: number;
  totalSale: number;
  saleVnPayQr: number;
  saleVietQr: number;
  actualSale: number;
  discountOffline: number;
  discountOnline: number;
  discountPartner: number;
  discountTotal: number;
  internalDiscountTotal: number;
};

interface TabSummaryProps {
  summaryByDate: Record<string, SummaryGroup>;
  isFetching: boolean;
  totalRevenue?: TotalRevenueProps;
  totalRevenueOnline?: TotalRevenueOnlineProps;
  totalRevenueOffline?: TotalRevenueOnlineProps;
}

const TabSummary = ({
  summaryByDate,
  isFetching,
  totalRevenue,
  totalRevenueOnline,
  totalRevenueOffline
}: TabSummaryProps) => {
  const sumGroup = (rows: Row[]) => {
    const prices: Record<number, number> = {};
    let totalPlanScreen = 0;
    let totalQuantity = 0;
    let totalInvitationQuantity = 0;
    let totalContractQuantity = 0;
    let totalSale = 0;
    let saleVnPayQr = 0;
    let saleVietQr = 0;
    let actualSale = 0;
    let discountOffline = 0;
    let discountOnline = 0;
    let discountPartner = 0;
    let discountTotal = 0;
    let internalDiscountTotal = 0;

    rows.forEach((r) => {
      totalPlanScreen += 1;
      totalQuantity += r.totalQuantity;
      totalInvitationQuantity += r.totalInvitationQuantity;
      totalContractQuantity += r.totalContractQuantity;
      totalSale += r.totalSale;
      saleVnPayQr += r.saleVnPayQr;
      saleVietQr += r.saleVietQr;
      actualSale += r.actualSale;
      discountOffline += r.discountOffline;
      discountOnline += r.discountOnline;
      discountPartner += r.discountPartner;
      discountTotal += r.discountTotal;
      internalDiscountTotal += r.internalDiscountTotal;

      Object.entries(r.pricesMap).forEach(([price, qty]) => {
        const p = Number(price);
        prices[p] = (prices[p] ?? 0) + qty;
      });
    });

    return {
      prices,
      totalPlanScreen,
      totalQuantity,
      totalInvitationQuantity,
      totalContractQuantity,
      totalSale,
      saleVnPayQr,
      saleVietQr,
      actualSale,
      discountOffline,
      discountOnline,
      discountPartner,
      discountTotal,
      internalDiscountTotal
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
      totalPlanScreen: offSum.totalPlanScreen,
      pricesMap: offSum.prices,
      totalQuantity: offSum.totalQuantity,
      totalInvitationQuantity: offSum.totalInvitationQuantity,
      totalContractQuantity: offSum.totalContractQuantity,
      totalSale: offSum.totalSale,
      saleVnPayQr: offSum.saleVnPayQr,
      saleVietQr: offSum.saleVietQr,
      actualSale: offSum.actualSale,
      discountOffline: offSum.discountOffline,
      discountOnline: offSum.discountOnline,
      discountPartner: offSum.discountPartner,
      discountTotal: offSum.discountTotal,
      internalDiscountTotal: offSum.internalDiscountTotal
    });

    tableData.push({
      key: `${date}-on`,
      projectDate: date,
      isOnline: true,
      totalPlanScreen: onSum.totalPlanScreen,
      pricesMap: onSum.prices,
      totalQuantity: onSum.totalQuantity,
      totalInvitationQuantity: onSum.totalInvitationQuantity,
      totalContractQuantity: onSum.totalContractQuantity,
      totalSale: onSum.totalSale,
      saleVnPayQr: onSum.saleVnPayQr,
      saleVietQr: onSum.saleVietQr,
      actualSale: onSum.actualSale,
      discountOffline: onSum.discountOffline,
      discountOnline: onSum.discountOnline,
      discountPartner: onSum.discountPartner,
      discountTotal: onSum.discountTotal,
      internalDiscountTotal: onSum.internalDiscountTotal
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
      title: "Tổng ca chiếu",
      key: "totalPlanScreen",
      dataIndex: "totalPlanScreen",
      width: 120,
      align: "right",
      render: (value: number) => formatNumber(value),
      fixed: "left"
    },
    // {
    //   title: "Loại giá vé (Đơn vị tính: 1.000 đồng)",
    //   children: priceColumns
    // },
    {
      title: "Tổng vé",
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
      title: "Khuyến mại",
      children: [
        {
          title: "Offline",
          key: "discountOffline",
          dataIndex: "discountOffline",
          width: 110,
          align: "right",
          render: (value: number) => formatMoney(value)
        },
        {
          title: "Online",
          key: "discountOnline",
          dataIndex: "discountOnline",
          width: 110,
          align: "right",
          render: (value: number) => formatMoney(value)
        },
        {
          title: "Đại lý",
          key: "discountPartner",
          dataIndex: "discountPartner",
          width: 110,
          align: "right",
          render: (value: number) => formatMoney(value)
        }
      ]
    },
    {
      title: "Tổng sau KM",
      key: "discountTotal",
      dataIndex: "discountTotal",
      width: 150,
      align: "right",
      render: (_: number, row: SummaryRow) => formatMoney(row.totalSale - row.discountTotal)
    },
    {
      title: "Giảm giá",
      key: "internalDiscountTotal",
      dataIndex: "internalDiscountTotal",
      width: 150,
      align: "right",
      render: (value: number) => formatMoney(value)
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
    <AutoHeightTable
      dataSource={tableData}
      columns={columns}
      bordered
      size="small"
      loading={isFetching}
      pagination={false}
      summary={() => {
        const summaryRows = [
          { label: "Online", value: totalRevenueOnline },
          { label: "Offline", value: totalRevenueOffline },
          { label: "Tổng cộng", value: totalRevenue }
        ].filter((item) => !!item.value);

        if (summaryRows.length === 0) {
          return null;
        }

        return (
          <Table.Summary fixed>
            {summaryRows.map(({ label, value }) => (
              <Table.Summary.Row key={label}>
                {(() => {
                  const crmDiscount = value?.crmDiscount ?? {};
                  const internalDiscount = value?.internalDiscount ?? {};
                  const crmDiscountTotal = crmDiscount.discountTotal ?? value?.discountTotal ?? 0;
                  const totalAfterDiscount = (value?.totalSale || 0) - crmDiscountTotal;

                  return (
                    <>
                      <Table.Summary.Cell index={0} colSpan={3}>
                        <strong>{label}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right">
                        <strong>{formatNumber(value?.totalQuantity || 0)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right">
                        <strong>{formatNumber(value?.totalInvitationQuantity || 0)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="right">
                        <strong>{formatNumber(value?.totalContractQuantity || 0)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6} align="right">
                        <strong>{formatMoney(value?.totalSale || 0)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7} align="right">
                        <strong>
                          {formatMoney(crmDiscount.discountOffline ?? value?.discountOffline ?? 0)}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={8} align="right">
                        <strong>
                          {formatMoney(crmDiscount.discountOnline ?? value?.discountOnline ?? 0)}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={9} align="right">
                        <strong>
                          {formatMoney(crmDiscount.discountPartner ?? value?.discountPartner ?? 0)}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={10} align="right">
                        <strong>{formatMoney(totalAfterDiscount)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={11} align="right">
                        <strong>{formatMoney(internalDiscount.discountTotal ?? 0)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={12} align="right">
                        <strong>{formatMoney(value?.saleVnPayQr || 0)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={13} align="right">
                        <strong>{formatMoney(value?.saleVietQr || 0)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={14} align="right">
                        <strong>{formatMoney(value?.actualSale || 0)}</strong>
                      </Table.Summary.Cell>
                    </>
                  );
                })()}
              </Table.Summary.Row>
            ))}
          </Table.Summary>
        );
      }}
    />
  );
};

export default TabSummary;
