import { cn, formatMoney, formatNumber } from "@renderer/lib/utils";
import type { OrderPaperVoucherDetail, OrderPaperVoucherDetailLine } from "@shared/types";
import { Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";
import { TicketPercent } from "lucide-react";
import { Fragment } from "react";
import type { ReactNode } from "react";
import {
  buildPaperVoucherPaymentRows,
  PAPER_VOUCHER_LINE_STATUS_DISPLAY,
  PAPER_VOUCHER_STATUS_DISPLAY,
  type PaperVoucherPaymentRowTone
} from "./OrderPaperVoucherPayment.utils";

export type PaperVoucherRowRenderer = (
  label: string,
  value: ReactNode,
  options?: { valueClassName?: string }
) => ReactNode;

const ROW_TONE_CLASS: Record<PaperVoucherPaymentRowTone, string | undefined> = {
  default: undefined,
  voucher: "text-rose-600",
  paid: "text-emerald-700 text-base font-semibold dark:text-emerald-300",
  warning: "text-amber-700 dark:text-amber-200"
};

interface OrderPaperVoucherPaymentRowsProps {
  paperVoucher: OrderPaperVoucherDetail;
  renderRow: PaperVoucherRowRenderer;
}

/** Thay dòng "Khách cần thanh toán" của đơn có voucher giấy, giữ cách hiển thị dòng của dialog. */
export const OrderPaperVoucherPaymentRows = ({
  paperVoucher,
  renderRow
}: OrderPaperVoucherPaymentRowsProps) => (
  <>
    {buildPaperVoucherPaymentRows(paperVoucher).map((row) => (
      <Fragment key={row.key}>
        {renderRow(row.label, <span data-testid={`paper-voucher-${row.key}`}>{row.value}</span>, {
          valueClassName: ROW_TONE_CLASS[row.tone]
        })}
      </Fragment>
    ))}
  </>
);

const LINE_COLUMNS: TableColumnsType<OrderPaperVoucherDetailLine> = [
  {
    title: "Mã lô",
    key: "batchCode",
    dataIndex: "batchCode",
    width: 100
  },
  {
    title: "Tên lô",
    key: "batchName",
    dataIndex: "batchName",
    ellipsis: true,
    render: (value: string | null) => value || "-"
  },
  {
    title: "Mệnh giá",
    key: "faceValue",
    dataIndex: "faceValue",
    width: 110,
    align: "right",
    render: (value: number) => formatMoney(value)
  },
  {
    title: "Số tờ",
    key: "quantity",
    dataIndex: "quantity",
    width: 70,
    align: "right",
    render: (value: number) => formatNumber(value)
  },
  {
    title: "Đã áp dụng",
    key: "appliedAmount",
    dataIndex: "appliedAmount",
    width: 120,
    align: "right",
    render: (value: number) => formatMoney(value)
  },
  {
    title: "Tiền thừa",
    key: "excessAmount",
    dataIndex: "excessAmount",
    width: 110,
    align: "right",
    render: (value: number) => (value > 0 ? formatMoney(value) : "-")
  },
  {
    title: "Trạng thái",
    key: "status",
    dataIndex: "status",
    width: 170,
    render: (value: OrderPaperVoucherDetailLine["status"]) => {
      const display = PAPER_VOUCHER_LINE_STATUS_DISPLAY[value];
      return (
        <Tag color={display?.color} variant="outlined" className="m-0">
          {display?.label ?? value}
        </Tag>
      );
    }
  }
];

const formatDateTime = (value: string | null) =>
  value ? dayjs(value).format("HH:mm DD/MM/YYYY") : null;

interface OrderPaperVoucherLinesProps {
  paperVoucher: OrderPaperVoucherDetail;
}

/** Các lô voucher giấy của đơn và trạng thái voucher (chỉ hiển thị dữ liệu backend ghi nhận). */
export const OrderPaperVoucherLines = ({ paperVoucher }: OrderPaperVoucherLinesProps) => {
  const status = PAPER_VOUCHER_STATUS_DISPLAY[paperVoucher.status];
  const reversedAt = formatDateTime(paperVoucher.reversedAt);

  return (
    <section
      data-testid="order-paper-voucher-lines"
      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-app-border dark:bg-app-bg-container dark:shadow-none"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
          <TicketPercent className="size-4 text-primary" aria-hidden />
          Voucher giấy
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span>
            {formatNumber(paperVoucher.voucherQuantity)} tờ · Tổng mệnh giá{" "}
            <b className="tabular-nums">{formatMoney(paperVoucher.faceValueTotal)}</b>
          </span>
          <Tag
            data-testid="paper-voucher-status"
            color={status?.color}
            variant="outlined"
            className="m-0"
          >
            {status?.label ?? paperVoucher.status}
          </Tag>
        </div>
      </div>

      <Table<OrderPaperVoucherDetailLine>
        className={cn(
          "[&_.ant-table]:bg-transparent",
          "[&_.ant-table-thead>tr>th]:px-2.5 [&_.ant-table-thead>tr>th]:py-2 [&_.ant-table-thead>tr>th]:text-xs",
          "[&_.ant-table-tbody>tr>td]:px-2.5 [&_.ant-table-tbody>tr>td]:py-2 [&_.ant-table-tbody>tr>td]:text-sm"
        )}
        columns={LINE_COLUMNS}
        dataSource={paperVoucher.lines}
        rowKey="batchId"
        size="small"
        tableLayout="fixed"
        pagination={false}
        scroll={{ x: 760 }}
      />

      {reversedAt && (
        <p
          data-testid="paper-voucher-reversal"
          className="mt-2 text-xs text-slate-500 dark:text-slate-400"
        >
          {status?.label ?? paperVoucher.status} lúc {reversedAt}
          {paperVoucher.reversedBy ? ` bởi ${paperVoucher.reversedBy}` : ""}
          {paperVoucher.reversalReason ? ` · ${paperVoucher.reversalReason}` : ""}
        </p>
      )}
    </section>
  );
};
