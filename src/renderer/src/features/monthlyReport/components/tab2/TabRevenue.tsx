import AutoHeightTable from "@renderer/components/AutoHeightTable";
import { TreeRow } from ".";
import type { TableProps } from "antd";

interface TabRevenueProps {
  tableData: TreeRow[];
  columns: TableProps<TreeRow>["columns"];
  isFetching: boolean;
}

const TabRevenue = ({ tableData, columns, isFetching }: TabRevenueProps) => {
  return (
    <AutoHeightTable
      dataSource={tableData}
      columns={columns}
      bordered
      size="small"
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
