"use client";

import { Table } from "antd";
import { Row } from ".";
import type { TableProps } from "antd";
import { ReportMonthlyRevenueTicketByStaffProps } from "@renderer/types";
import { formatMoney, formatNumber } from "@renderer/lib/utils";

interface TabRevenueProps {
  tableData: Row[];
  columns: TableProps<Row>["columns"];
  isFetching: boolean;
  data?: ReportMonthlyRevenueTicketByStaffProps;
}

const TabRevenue = ({ tableData, columns, isFetching, data }: TabRevenueProps) => {
  return (
    <Table
      dataSource={tableData}
      columns={columns}
      bordered
      size="small"
      scroll={{ x: "max-content", y: "calc(100vh - 360px)" }}
      loading={isFetching}
      pagination={false}
      summary={() =>
        data ? (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <b>Tổng cộng</b>
              </Table.Summary.Cell>

              {data?.priceHeaders.map((price, i) => {
                const total =
                  data?.totalRevenue.prices.find((p) => p.price === price)?.totalQuantity || 0;

                return (
                  <Table.Summary.Cell key={price} index={i + 2} align="right">
                    <b>{formatNumber(total)}</b>
                  </Table.Summary.Cell>
                );
              })}

              <Table.Summary.Cell index={999} align="right">
                <b>{formatNumber(data?.totalRevenue.totalQuantity)}</b>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1000} align="right">
                <b>{formatMoney(data?.totalRevenue.totalSale)}</b>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        ) : null
      }
    />
  );
};

export default TabRevenue;
