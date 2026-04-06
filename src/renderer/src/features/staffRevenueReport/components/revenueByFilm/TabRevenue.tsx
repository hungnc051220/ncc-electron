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
    />
  );
};

export default TabRevenue;
