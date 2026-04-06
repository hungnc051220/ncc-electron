import AutoHeightTable from "@renderer/components/AutoHeightTable";
import { Row } from ".";
import type { TableProps } from "antd";

interface TabRevenueProps {
  tableData: Row[];
  columns: TableProps<Row>["columns"];
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
