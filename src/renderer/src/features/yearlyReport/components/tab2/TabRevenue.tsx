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
      rowClassName={(row) => (row.isSummary ? "bg-gray-100 dark:bg-app-bg font-bold" : "")}
    />
  );
};

export default TabRevenue;
