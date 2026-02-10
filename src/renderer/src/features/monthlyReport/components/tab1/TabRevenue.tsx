"use client";

import { Table } from "antd";
import { TreeRow } from ".";
import type { TableProps } from "antd";

interface TabRevenueProps {
  tableData: TreeRow[];
  columns: TableProps<TreeRow>["columns"];
  isFetching: boolean;
}

const TabRevenue = ({ tableData, columns, isFetching }: TabRevenueProps) => {
  return (
    <Table
      dataSource={tableData}
      columns={columns}
      bordered
      size="small"
      scroll={{ x: "max-content", y: "calc(100vh - 375px)" }}
      loading={isFetching}
      pagination={false}
      rowClassName={(row) => (row.isSummary ? "bg-gray-100 font-bold" : "")}
    />
  );
};

export default TabRevenue;
