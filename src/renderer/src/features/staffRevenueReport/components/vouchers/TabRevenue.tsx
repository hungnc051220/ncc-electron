import AutoHeightTable from "@renderer/components/AutoHeightTable";
import { formatNumber } from "@renderer/lib/utils";
import { VoucherUsageProps } from "@shared/types";
import type { TableProps } from "antd";
import { Table } from "antd";

interface TabRevenueProps {
  tableData: VoucherUsageProps[];
  columns: TableProps<VoucherUsageProps>["columns"];
  isFetching: boolean;
  total?: number;
}

const TabRevenue = ({ tableData, columns, isFetching, total }: TabRevenueProps) => {
  return (
    <AutoHeightTable
      dataSource={tableData}
      columns={columns}
      bordered
      size="small"
      loading={isFetching}
      pagination={false}
      summary={() =>
        tableData && tableData.length > 0 ? (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <strong>Tổng</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>
                <strong>{formatNumber(total || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3}></Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        ) : null
      }
    />
  );
};

export default TabRevenue;
