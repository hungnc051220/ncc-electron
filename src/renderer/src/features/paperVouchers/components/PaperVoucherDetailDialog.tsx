import OrderDetailDialog from "@renderer/features/orderHistory/components/OrderDetailDialog";
import { usePaperVoucherBatch } from "@renderer/hooks/paperVouchers/usePaperVoucherBatches";
import { usePaperVoucherUsages } from "@renderer/hooks/paperVouchers/usePaperVoucherUsages";
import { getSafeApiErrorMessage } from "@renderer/lib/apiError";
import { cn, formatMoney, formatNumber } from "@renderer/lib/utils";
import type { PaperVoucherBatch, PaperVoucherUsage } from "@shared/types";
import type { DescriptionsProps, TableProps } from "antd";
import { Alert, Button, Descriptions, Empty, Modal, Table, Tag } from "antd";
import dayjs from "dayjs";
import type { LucideIcon } from "lucide-react";
import { Hourglass, Ticket, TicketCheck } from "lucide-react";
import { useMemo, useState } from "react";
import {
  formatPaperVoucherValidity,
  getPaperVoucherAmounts,
  getPaperVoucherStatus,
  getPaperVoucherUsageStatusMeta,
  PAPER_VOUCHER_STATUS_META
} from "../paperVoucher.utils";
import PaperVoucherImageGallery from "./PaperVoucherImageGallery";
import { STAT_TONES, type StatTone } from "./PaperVoucherStats";

interface PaperVoucherDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: PaperVoucherBatch;
  today: string;
}

const formatDateTime = (value?: string | null) =>
  value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "--";

const UsageStatusTag = ({ status }: { status: PaperVoucherUsage["status"] }) => {
  const meta = getPaperVoucherUsageStatusMeta(status);
  return (
    <Tag color={meta.color} variant="outlined" className="m-0">
      {meta.label}
    </Tag>
  );
};

const getUsageColumns = (
  onOpenOrder: (orderId: number) => void
): TableProps<PaperVoucherUsage>["columns"] => [
  {
    title: "Thời gian",
    key: "createdAt",
    dataIndex: "createdAt",
    width: 140,
    render: (value: string) => formatDateTime(value)
  },
  {
    title: "Mã đơn",
    key: "orderId",
    dataIndex: "orderId",
    width: 120,
    render: (value?: number | null) =>
      value ? (
        <Button
          type="link"
          size="small"
          className="h-auto! p-0! font-medium tabular-nums"
          title="Xem thông tin bán vé"
          onClick={() => onOpenOrder(value)}
        >
          {value}
        </Button>
      ) : (
        "--"
      )
  },
  {
    title: "Trạng thái",
    key: "status",
    dataIndex: "status",
    width: 180,
    render: (value: PaperVoucherUsage["status"]) => <UsageStatusTag status={value} />
  },
  {
    title: "Số lượng",
    key: "quantity",
    dataIndex: "quantity",
    width: 90,
    align: "right",
    render: (value: number) => formatNumber(value)
  },
  {
    title: "Giá trị áp dụng",
    key: "appliedAmount",
    dataIndex: "appliedAmount",
    width: 140,
    align: "right",
    render: (value: number) => formatMoney(value)
  },
  {
    title: "Nhân viên",
    key: "staffName",
    dataIndex: "staffName",
    ellipsis: true,
    render: (value?: string | null) => value || "--"
  }
];

const SectionTitle = ({ children }: { children: string }) => (
  <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{children}</h4>
);

interface UsageStatCardProps {
  testId: string;
  label: string;
  quantity: number;
  amount: number;
  icon: LucideIcon;
  tone: StatTone;
  /** Tỉ lệ so với tổng phát hành, kèm thanh tiến độ; bỏ trống với card tổng phát hành. */
  percent?: number;
}

const UsageStatCard = ({
  testId,
  label,
  quantity,
  amount,
  icon: Icon,
  tone,
  percent
}: UsageStatCardProps) => (
  <div
    data-testid={testId}
    className="flex min-w-0 flex-col gap-3 rounded-xl border border-app-border bg-app-bg-container p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none"
  >
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
          STAT_TONES[tone].icon
        )}
      >
        <Icon strokeWidth={2} className="size-4.5" />
      </span>
      <span
        title={label}
        className="min-w-0 flex-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400"
      >
        {label}
      </span>
      {percent !== undefined && (
        <span className={cn("text-xs font-semibold tabular-nums", STAT_TONES[tone].accent)}>
          {percent}%
        </span>
      )}
    </div>
    <div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl leading-7 font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-50">
          {formatNumber(quantity)}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">phiếu</span>
      </div>
      <div className="text-sm text-slate-600 tabular-nums dark:text-slate-300">
        Trị giá {formatMoney(amount)}
      </div>
    </div>
    {percent !== undefined && (
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div
          className={cn("h-full rounded-full", STAT_TONES[tone].bar)}
          style={{ width: `${percent}%` }}
        />
      </div>
    )}
  </div>
);

const PaperVoucherDetailDialog = ({
  open,
  onOpenChange,
  batch: initialBatch,
  today
}: PaperVoucherDetailDialogProps) => {
  const { data: batch = initialBatch, error: batchError } = usePaperVoucherBatch(
    initialBatch,
    open
  );
  const amounts = getPaperVoucherAmounts(batch);
  const {
    data: usages = [],
    isFetching: isFetchingUsages,
    error: usagesError
  } = usePaperVoucherUsages(batch.id, open);
  const loadError = batchError ?? usagesError;
  const [viewingOrderId, setViewingOrderId] = useState<number | null>(null);
  const usageColumns = useMemo(() => getUsageColumns(setViewingOrderId), []);
  const usedPercent = batch.totalQuantity
    ? Math.round((batch.usedCount / batch.totalQuantity) * 100)
    : 0;
  const remainingPercent = batch.totalQuantity ? 100 - usedPercent : 0;
  const status = PAPER_VOUCHER_STATUS_META[getPaperVoucherStatus(batch, today)];

  const infoItems: DescriptionsProps["items"] = [
    { key: "batchCode", label: "Mã lô", children: batch.batchCode },
    {
      key: "status",
      label: "Trạng thái",
      children: <Tag color={status.color}>{status.label}</Tag>
    },
    { key: "name", label: "Tên lô", children: batch.name, span: 2 },
    { key: "faceValue", label: "Mệnh giá", children: formatMoney(batch.faceValue) },
    {
      key: "validity",
      label: "Hạn sử dụng",
      children: formatPaperVoucherValidity(batch.validFrom, batch.expiresAt)
    },
    { key: "note", label: "Ghi chú", children: batch.note || "--", span: 2 },
    { key: "createdAt", label: "Ngày tạo", children: formatDateTime(batch.createdAt) },
    { key: "updatedAt", label: "Cập nhật lần cuối", children: formatDateTime(batch.updatedAt) }
  ];

  return (
    <Modal
      open={open}
      title={`Chi tiết lô ${batch.batchCode}`}
      onCancel={() => onOpenChange(false)}
      footer={<Button onClick={() => onOpenChange(false)}>Đóng</Button>}
      width="min(1080px, calc(100vw - 48px))"
      centered
      destroyOnHidden
      classNames={{
        wrapper: "py-4",
        container: "overflow-hidden p-0!",
        header:
          "mb-0! border-b border-slate-200 px-5 py-3 dark:border-app-border dark:bg-app-bg-container",
        body: "max-h-[calc(100vh-144px)] overflow-y-auto px-5! py-4! dark:bg-app-bg-container",
        footer:
          "mt-0! border-t border-slate-200 px-5 py-2.5 dark:border-app-border dark:bg-app-bg-container"
      }}
    >
      <div className="flex flex-col gap-4">
        {loadError && (
          <Alert
            type="error"
            showIcon
            title={getSafeApiErrorMessage(loadError, "Không tải được thông tin lô voucher")}
          />
        )}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-4">
            <section>
              <SectionTitle>Thông tin lô</SectionTitle>
              <Descriptions size="small" bordered column={2} items={infoItems} />
            </section>
            <section>
              <SectionTitle>Thống kê sử dụng</SectionTitle>
              <div className="grid grid-cols-3 gap-3">
                <UsageStatCard
                  testId="paper-voucher-detail-stat-issued"
                  label="Phát hành"
                  quantity={batch.totalQuantity}
                  amount={amounts.totalFaceValue}
                  icon={Ticket}
                  tone="blue"
                />
                <UsageStatCard
                  testId="paper-voucher-detail-stat-used"
                  label="Đã sử dụng"
                  quantity={batch.usedCount}
                  amount={amounts.usedFaceValue}
                  icon={TicketCheck}
                  tone="emerald"
                  percent={usedPercent}
                />
                <UsageStatCard
                  testId="paper-voucher-detail-stat-remaining"
                  label="Chưa sử dụng"
                  quantity={amounts.remainingQuantity}
                  amount={amounts.remainingFaceValue}
                  icon={Hourglass}
                  tone="amber"
                  percent={remainingPercent}
                />
              </div>
            </section>
          </div>
          <section className="flex min-w-0 flex-col">
            <SectionTitle>Hình ảnh voucher</SectionTitle>
            {batch.images?.length ? (
              <PaperVoucherImageGallery images={batch.images} batchCode={batch.batchCode} />
            ) : (
              <div className="flex min-h-40 flex-1 items-center justify-center rounded-lg border border-dashed border-app-border">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Chưa có hình ảnh voucher"
                />
              </div>
            )}
          </section>
        </div>
        <section>
          <SectionTitle>Lịch sử sử dụng</SectionTitle>
          {usages.length > 0 ? (
            <Table<PaperVoucherUsage>
              rowKey="id"
              size="small"
              bordered
              pagination={false}
              loading={isFetchingUsages}
              dataSource={usages}
              columns={usageColumns}
              scroll={{ y: 240 }}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-app-border py-2">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lượt sử dụng" />
            </div>
          )}
        </section>
      </div>
      {viewingOrderId && (
        <OrderDetailDialog
          open
          onOpenChange={(nextOpen) => !nextOpen && setViewingOrderId(null)}
          selectedOrderId={viewingOrderId}
        />
      )}
    </Modal>
  );
};

export default PaperVoucherDetailDialog;
