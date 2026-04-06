import AutoHeightTable from "@renderer/components/AutoHeightTable";
import { TimeTreeRow } from ".";
import type { TableProps } from "antd";

interface TabRevenueProps {
  tableData: TimeTreeRow[];
  columns: TableProps<TimeTreeRow>["columns"];
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
      rowKey="key"
      pagination={false}
      expandable={{ defaultExpandAllRows: false, indentSize: 18 }}
      rowClassName={(row) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(row.label)) return "bg-primary/5 font-semibold";
        if (row.label.startsWith("Phòng")) return "bg-slate-100 dark:bg-app-bg font-bold";
        return "";
      }}
    />
  );
};

export default TabRevenue;
