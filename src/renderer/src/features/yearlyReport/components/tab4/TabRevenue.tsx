import { Table } from "antd";
import { YearlyReportSummaryItem } from "@shared/types";
import type { TableProps } from "antd";

interface TabRevenueProps {
  tableData: YearlyReportSummaryItem[];
  columns: TableProps<YearlyReportSummaryItem>["columns"];
  isFetching: boolean;
}

const TabRevenue = ({ tableData, columns, isFetching }: TabRevenueProps) => {
  return (
    <Table
      dataSource={tableData}
      columns={columns}
      bordered
      rowKey="manufacturerId"
      size="small"
      scroll={{ x: "max-content", y: "calc(100vh - 375px)" }}
      loading={isFetching}
      pagination={false}
    />
  );
};

export default TabRevenue;
