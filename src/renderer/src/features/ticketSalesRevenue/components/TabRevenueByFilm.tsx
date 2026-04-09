import { useReportTicketSalesRevenue } from "@renderer/hooks/reports/useReportTicketSalesRevenue";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import DateRangeRequiredEmptyState from "@renderer/features/staffRevenueReport/components/DateRangeRequiredEmptyState";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { ReportRevenueFilmProps, RevenueByFilmProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Table, Typography } from "antd";
import type { Dayjs } from "dayjs";
import { useEffect, useState } from "react";

const { Text } = Typography;

interface TabRevenueByFilmProps {
  fromDate?: Dayjs;
  toDate?: Dayjs;
}

const compareText = (left?: string | null, right?: string | null) =>
  (left || "").localeCompare(right || "", "vi", { sensitivity: "base" });

const compareNumber = (left?: number | null, right?: number | null) => (left || 0) - (right || 0);

const TabRevenueByFilm = ({ fromDate, toDate }: TabRevenueByFilmProps) => {
  const [current, setCurrent] = useState(1);
  const hasDateRange = !!fromDate && !!toDate;

  const onChange: PaginationProps["onChange"] = (page) => {
    setCurrent(page);
  };

  useEffect(() => {
    setCurrent(1);
  }, [fromDate, toDate]);

  const { data, isFetching: isFetchingData } = useReportTicketSalesRevenue(
    {
      fromDate: fromDate?.startOf("day").format() || "",
      toDate: toDate?.endOf("day").format() || "",
      reportType: "FILM"
    },
    hasDateRange
  );

  const formatData = (hasDateRange ? data : undefined) as ReportRevenueFilmProps | undefined;

  const columns: TableProps<RevenueByFilmProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      width: 50,
      align: "center",
      render: (_, __, index) => (current - 1) * 100 + index + 1,
      fixed: "start"
    },
    {
      title: "Tên phim",
      dataIndex: "filmName",
      key: "filmName",
      sorter: (a, b) => compareText(a.filmName, b.filmName),
      width: 400,
      fixed: "start"
    },
    {
      title: "Online",
      dataIndex: "onQuantity",
      key: "onQuantity",
      sorter: (a, b) => compareNumber(a.onQuantity, b.onQuantity),
      align: "right",
      render: (_, { onQuantity }) => formatNumber(onQuantity || 0)
    },
    {
      title: "Offline",
      dataIndex: "offQuantity",
      key: "offQuantity",
      sorter: (a, b) => compareNumber(a.offQuantity, b.offQuantity),
      align: "right",
      render: (_, { offQuantity }) => formatNumber(offQuantity || 0)
    },
    {
      title: "Tổng vé",
      dataIndex: "totalQuantity",
      key: "totalQuantity",
      sorter: (a, b) => compareNumber(a.totalQuantity, b.totalQuantity),
      align: "right",
      render: (_, { totalQuantity }) => formatNumber(totalQuantity || 0)
    },
    {
      title: "Doanh thu VietQR",
      dataIndex: "offSaleVietQr",
      key: "offSaleVietQr",
      sorter: (a, b) => compareNumber(a.offSaleVietQr, b.offSaleVietQr),
      align: "right",
      render: (_, { offSaleVietQr }) => formatMoney(offSaleVietQr || 0)
    },
    {
      title: "Doanh thu Online",
      dataIndex: "onSaleTotal",
      key: "onSaleTotal",
      sorter: (a, b) => compareNumber(a.onSaleTotal, b.onSaleTotal),
      align: "right",
      render: (_, { onSaleTotal }) => formatMoney(onSaleTotal || 0)
    },
    {
      title: "Doanh thu Offline",
      dataIndex: "actualOffSale",
      key: "actualOffSale",
      sorter: (a, b) => compareNumber(a.actualOffSale, b.actualOffSale),
      align: "right",
      render: (_, { actualOffSale }) => formatMoney(actualOffSale || 0)
    },
    {
      title: "Doanh thu tổng",
      dataIndex: "totalSale",
      key: "totalSale",
      sorter: (a, b) => compareNumber(a.totalSale, b.totalSale),
      align: "right",
      render: (_, { totalSale }) => formatMoney(totalSale || 0)
    }
  ];

  if (!hasDateRange) {
    return <DateRangeRequiredEmptyState />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AutoHeightTable
        dataSource={formatData?.revenueByFilm || []}
        columns={columns}
        bordered
        size="small"
        loading={isFetchingData}
        pagination={{
          current,
          onChange,
          total: formatData?.revenueByFilm?.length || 0,
          size: "middle",
          showSizeChanger: false,
          showTotal: (total) => `Tổng ${total} bản ghi`,
          pageSize: 100
        }}
        summary={() =>
          formatData?.revenueByFilm && formatData?.revenueByFilm?.length > 0 ? (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2} className="font-bold text-center">
                  Tổng
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text className="font-bold">
                    {formatNumber(formatData?.totalByFilm?.onQuantity || 0)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <Text className="font-bold">
                    {formatNumber(formatData?.totalByFilm?.offQuantity || 0)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Text className="font-bold">
                    {formatNumber(formatData?.totalByFilm?.totalQuantity || 0)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <Text className="font-bold">
                    {formatMoney(formatData?.totalByFilm?.offSaleVietQr || 0)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <Text className="font-bold">
                    {formatMoney(formatData?.totalByFilm?.onSaleTotal || 0)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <Text className="font-bold">
                    {formatMoney(formatData?.totalByFilm?.actualOffSale || 0)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">
                  <Text className="font-bold">
                    {formatMoney(formatData?.totalByFilm?.totalSale || 0)}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          ) : null
        }
      />
    </div>
  );
};

export default TabRevenueByFilm;
