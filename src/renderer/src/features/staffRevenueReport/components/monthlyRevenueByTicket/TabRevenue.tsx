import AutoHeightTable from "@renderer/components/AutoHeightTable";
import { Table } from "antd";
import { Row } from ".";
import type { TableProps } from "antd";
import { ReportMonthlyRevenueTicketByStaffProps } from "@shared/types";
import { formatMoney, formatNumber } from "@renderer/lib/utils";

interface TabRevenueProps {
  tableData: Row[];
  columns: TableProps<Row>["columns"];
  isFetching: boolean;
  data?: ReportMonthlyRevenueTicketByStaffProps;
}

const TabRevenue = ({ tableData, columns, isFetching, data }: TabRevenueProps) => {
  const summaryRows = data
    ? [
        {
          label: "Offline",
          totalQuantity: data.totalRevenueOffline.totalQuantity,
          totalSale: data.totalRevenueOffline.totalSale
        },
        {
          label: "Online",
          totalQuantity: data.totalRevenueOnline.totalQuantity,
          totalSale: data.totalRevenueOnline.totalSale
        },
        {
          label: "Tổng cộng",
          totalQuantity: data.totalRevenue.totalQuantity,
          totalSale: data.totalRevenue.totalSale
        }
      ]
    : [];

  return (
    <AutoHeightTable
      dataSource={tableData}
      columns={columns}
      bordered
      size="small"
      loading={isFetching}
      pagination={false}
      summary={() =>
        data ? (
          <Table.Summary fixed>
            {summaryRows.map(({ label, totalQuantity, totalSale }) => {
              return (
                <Table.Summary.Row key={label}>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <b>{label}</b>
                  </Table.Summary.Cell>

                  <Table.Summary.Cell index={2} align="right">
                    <b>{formatNumber(totalQuantity)}</b>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <b>{formatMoney(totalSale)}</b>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              );
            })}
          </Table.Summary>
        ) : null
      }
    />
  );
};

export default TabRevenue;
