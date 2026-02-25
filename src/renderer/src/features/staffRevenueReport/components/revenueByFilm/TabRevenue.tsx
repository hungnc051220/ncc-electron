import { Table } from "antd";
import { Row } from ".";
import type { TableProps } from "antd";

interface TabRevenueProps {
  tableData: Row[];
  columns: TableProps<Row>["columns"];
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
    />
  );
};

export default TabRevenue;
