import { Table } from "antd";
import { TimeTreeRow } from ".";
import type { TableProps } from "antd";

interface TabRevenueProps {
  tableData: TimeTreeRow[];
  columns: TableProps<TimeTreeRow>["columns"];
  isFetching: boolean;
}

const TabRevenue = ({ tableData, columns, isFetching }: TabRevenueProps) => {
  return (
    <Table
      dataSource={tableData}
      columns={columns}
      bordered
      size="small"
      scroll={{ x: "max-content", y: "calc(100vh - 410px)" }}
      loading={isFetching}
      rowKey="key"
      pagination={false}
      expandable={{ defaultExpandAllRows: false, indentSize: 18 }}
      rowClassName={(row) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(row.label)) return "bg-primary/5 font-semibold";
        if (row.label.startsWith("Phòng")) return "bg-slate-100 font-bold";
        return "";
      }}
    />
  );
};

export default TabRevenue;
