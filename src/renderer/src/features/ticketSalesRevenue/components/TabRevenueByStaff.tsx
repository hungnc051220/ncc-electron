import { useReportTicketSalesRevenue } from "@renderer/hooks/reports/useReportTicketSalesRevenue";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import DateRangeRequiredEmptyState from "@renderer/features/staffRevenueReport/components/DateRangeRequiredEmptyState";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { ReportRevenueStaffProps, RevenueByEmployeeProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Table, Typography } from "antd";
import type { Dayjs } from "dayjs";
import { useEffect, useState } from "react";

const { Text } = Typography;

interface TabRevenueByStaffProps {
  fromDate?: Dayjs;
  toDate?: Dayjs;
}

const TabRevenueByStaff = ({ fromDate, toDate }: TabRevenueByStaffProps) => {
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
      reportType: "STAFF"
    },
    hasDateRange
  );

  const formatData = (hasDateRange ? data : undefined) as ReportRevenueStaffProps | undefined;

  const columns: TableProps<RevenueByEmployeeProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      width: 50,
      align: "center",
      render: (_, __, index) => (current - 1) * 100 + index + 1,
      fixed: "start"
    },
    {
      title: "Tên nhân viên",
      dataIndex: "userName",
      key: "userName",
      width: 200,
      fixed: "start"
    },
    {
      title: "Online",
      dataIndex: "onQuantity",
      key: "onQuantity",
      align: "right",
      render: (_, { onQuantity }) => formatNumber(onQuantity || 0)
    },
    {
      title: "Offline",
      dataIndex: "offQuantity",
      key: "offQuantity",
      align: "right",
      render: (_, { offQuantity }) => formatNumber(offQuantity || 0)
    },
    {
      title: "Tổng vé",
      dataIndex: "totalQuantity",
      key: "totalQuantity",
      align: "right",
      render: (_, { totalQuantity }) => formatNumber(totalQuantity || 0)
    },
    {
      title: "Doanh thu VNPayQR",
      dataIndex: "offSaleVnPayQr",
      key: "offSaleVnPayQr",
      align: "right",
      render: (_, { offSaleVnPayQr }) => formatMoney(offSaleVnPayQr || 0)
    },
    {
      title: "Doanh thu VietQR",
      dataIndex: "offSaleVietQr",
      key: "offSaleVietQr",
      align: "right",
      render: (_, { offSaleVietQr }) => formatMoney(offSaleVietQr || 0)
    },
    {
      title: "Doanh thu Offline",
      dataIndex: "actualOffSale",
      key: "actualOffSale",
      align: "right",
      render: (_, { actualOffSale }) => formatMoney(actualOffSale || 0)
    },
    {
      title: "Tiền thực nộp",
      dataIndex: "totalSale",
      key: "totalSale",
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
        dataSource={formatData?.revenueByEmployee || []}
        columns={columns}
        bordered
        size="small"
        loading={isFetchingData}
        pagination={{
          current,
          onChange,
          total: formatData?.revenueByEmployee?.length || 0,
          size: "middle",
          showSizeChanger: false,
          showTotal: (total) => `Tổng ${total} bản ghi`,
          pageSize: 100
        }}
        summary={() =>
          formatData?.revenueByEmployee && formatData?.revenueByEmployee.length > 0 ? (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2} className="font-bold text-center">
                  Tổng
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text className="font-bold">
                    {formatNumber(formatData?.totalByEmployee?.onQuantity || 0)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <Text className="font-bold">
                    {formatNumber(formatData?.totalByEmployee?.offQuantity || 0)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Text className="font-bold">
                    {formatNumber(formatData?.totalByEmployee?.totalQuantity || 0)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <Text className="font-bold">
                    {formatMoney(formatData?.totalByEmployee?.offSaleVnPayQr || 0)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <Text className="font-bold">
                    {formatMoney(formatData?.totalByEmployee?.offSaleVietQr || 0)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <Text className="font-bold">
                    {formatMoney(formatData?.totalByEmployee?.actualOffSale || 0)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">
                  <Text className="font-bold">
                    {formatMoney(formatData?.totalByEmployee?.totalSale || 0)}
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

export default TabRevenueByStaff;
