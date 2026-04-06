import AutoHeightTable from "@renderer/components/AutoHeightTable";
import { YearlyReportSummaryItem } from "@shared/types";
import type { TableProps } from "antd";

interface TabRevenueProps {
  tableData: YearlyReportSummaryItem[];
  columns: TableProps<YearlyReportSummaryItem>["columns"];
  isFetching: boolean;
}

const TabRevenue = ({ tableData, columns, isFetching }: TabRevenueProps) => {
  return (
    <AutoHeightTable
      dataSource={tableData}
      columns={columns}
      bordered
      rowKey="manufacturerId"
      size="small"
      loading={isFetching}
      pagination={false}
    />
  );
};

export default TabRevenue;
