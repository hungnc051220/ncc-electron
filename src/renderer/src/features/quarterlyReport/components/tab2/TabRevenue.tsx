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
      scroll={{ x: "max-content", y: "calc(100vh - 450px)" }}
      loading={isFetching}
      pagination={false}
      expandable={{
        defaultExpandAllRows: false,
        indentSize: 18
      }}
      rowClassName={(row) => {
        if (row.version && !row.channel) return "bg-gray-50 dark:bg-app-bg font-medium";
        if (row.name && row.children) return "font-semibold";
        return "";
      }}
    />
  );
};

export default TabRevenue;
