import { Table } from "antd";
import { TableRow } from ".";
import type { TableProps } from "antd";
import { ExamineTicketTotalOnlineProps, ExamineTicketTotalProps } from "@shared/types";
import { formatNumber } from "@renderer/lib/utils";

interface TabRevenueProps {
  tableData: TableRow[];
  columns: TableProps<TableRow>["columns"];
  isFetching: boolean;
  total?: ExamineTicketTotalProps;
  totalOnline?: ExamineTicketTotalOnlineProps;
  totalOffline?: ExamineTicketTotalOnlineProps;
}

const TabRevenue = ({
  tableData,
  columns,
  isFetching,
  total,
  totalOnline,
  totalOffline
}: TabRevenueProps) => {
  return (
    <Table
      dataSource={tableData}
      columns={columns}
      bordered
      size="small"
      scroll={{ x: "max-content", y: "calc(100vh - 490px)" }}
      loading={isFetching}
      pagination={false}
      rowClassName={(row) => (row.isSummary ? "bg-gray-100 font-bold" : "")}
      summary={() =>
        tableData && tableData.length > 0 ? (
          <Table.Summary fixed>
            {/* ONLINE */}
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <strong>Online</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}></Table.Summary.Cell>
              <Table.Summary.Cell index={3}></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <strong>{formatNumber(totalOnline?.totalVipQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                <strong>{formatNumber(totalOnline?.totalRegularQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right">
                <strong>{formatNumber(totalOnline?.totalContractQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="right">
                <strong>{formatNumber(totalOnline?.totalVipCIQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right">
                <strong>{formatNumber(totalOnline?.totalRegularCIQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={9} align="right">
                <strong>{formatNumber(totalOnline?.totalContractCIQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={10} align="right">
                <strong>{formatNumber(totalOnline?.totalInvitationQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={11} align="right">
                <strong>{formatNumber(totalOnline?.totalQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={12} align="right">
                <strong>{formatNumber(totalOnline?.totalNotCIQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={13} align="right">
                <strong>{formatNumber(totalOnline?.totalCIQuantity || 0)}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>

            {/* OFFLINE */}
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <strong>Offline</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}></Table.Summary.Cell>
              <Table.Summary.Cell index={3}></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <strong>{formatNumber(totalOffline?.totalVipQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                <strong>{formatNumber(totalOffline?.totalRegularQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right">
                <strong>{formatNumber(totalOffline?.totalContractQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="right">
                <strong>{formatNumber(totalOffline?.totalVipCIQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right">
                <strong>{formatNumber(totalOffline?.totalRegularCIQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={9} align="right">
                <strong>{formatNumber(totalOffline?.totalContractCIQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={10} align="right">
                <strong>{formatNumber(totalOffline?.totalInvitationQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={11} align="right">
                <strong>{formatNumber(totalOffline?.totalQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={12} align="right">
                <strong>{formatNumber(totalOffline?.totalNotCIQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={13} align="right">
                <strong>{formatNumber(totalOffline?.totalCIQuantity || 0)}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>

            {/* TOTAL */}
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <strong>Tổng cộng</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}></Table.Summary.Cell>
              <Table.Summary.Cell index={3}></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <strong>{formatNumber(total?.totalVipQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                <strong>{formatNumber(total?.totalRegularQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right">
                <strong>{formatNumber(total?.totalContractQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="right">
                <strong>{formatNumber(total?.totalVipCIQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right">
                <strong>{formatNumber(total?.totalRegularCIQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={9} align="right">
                <strong>{formatNumber(total?.totalContractCIQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={10} align="right">
                <strong>{formatNumber(total?.totalInvitationQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={11} align="right">
                <strong>{formatNumber(total?.totalQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={12} align="right">
                <strong>{formatNumber(total?.totalNotCIQuantity || 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={13} align="right">
                <strong>{formatNumber(total?.totalCIQuantity || 0)}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        ) : null
      }
    />
  );
};

export default TabRevenue;
