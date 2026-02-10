"use client";

import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { U22UsageProps } from "@renderer/types";
import type { TableProps } from "antd";
import { Table } from "antd";

interface TabRevenueProps {
  tableData: U22UsageProps[];
  columns: TableProps<U22UsageProps>["columns"];
  isFetching: boolean;
  totalOrders?: number;
  totalAmount?: number;
}

const TabRevenue = ({
  tableData,
  columns,
  isFetching,
  totalOrders,
  totalAmount
}: TabRevenueProps) => {
  return (
    <Table
      dataSource={tableData}
      columns={columns}
      bordered
      size="small"
      scroll={{ x: "max-content", y: "calc(100vh - 415px)" }}
      loading={isFetching}
      pagination={false}
      summary={() =>
        tableData && tableData.length > 0 ? (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <strong>Tổng</strong>
              </Table.Summary.Cell>

              <Table.Summary.Cell index={2}></Table.Summary.Cell>
              <Table.Summary.Cell index={3}></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <strong>{formatNumber(totalOrders || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                <strong>{formatMoney(totalAmount || 0)}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        ) : null
      }
    />
  );
};

export default TabRevenue;
