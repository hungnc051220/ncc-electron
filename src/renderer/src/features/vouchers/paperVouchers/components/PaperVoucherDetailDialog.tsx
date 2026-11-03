import { usePaperVoucherBatch } from "@renderer/hooks/paperVouchers/usePaperVoucherBatches";
import { usePaperVoucherUsages } from "@renderer/hooks/paperVouchers/usePaperVoucherUsages";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import type {
  PaperVoucherBatch,
  PaperVoucherImage,
  PaperVoucherUsage,
  PaperVoucherUsageStatus
} from "@shared/types";
import type { DescriptionsProps, TableProps } from "antd";
import { Alert, Button, Descriptions, Empty, Image, Modal, Table, Tag } from "antd";
import dayjs from "dayjs";
import {
  formatPaperVoucherDate,
  getPaperVoucherAmounts,
  getPaperVoucherStatus,
  PAPER_VOUCHER_NO_EXPIRY_LABEL,
  PAPER_VOUCHER_STATUS_META
} from "../paperVoucher.utils";

interface PaperVoucherDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: PaperVoucherBatch;
  today: string;
}

const formatDateTime = (value?: string | null) =>
  value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "--";

const USAGE_STATUS_META: Record<PaperVoucherUsageStatus, { label: string; color: string }> = {
  applied: { label: "Đã áp dụng", color: "success" },
  reversed: { label: "Đã hoàn", color: "default" }
};

const USAGE_COLUMNS: TableProps<PaperVoucherUsage>["columns"] = [
  {
    title: "Thời gian",
    key: "createdAt",
    dataIndex: "createdAt",
    width: 130,
    render: (value: string) => formatDateTime(value)
  },
  {
    title: "Giao dịch",
    key: "transactionId",
    dataIndex: "transactionId",
    render: (value: string | null, record) => (
      <span className="flex items-center gap-1.5">
        <span className="truncate">{value || (record.orderId ? `#${record.orderId}` : "--")}</span>
        <Tag color={USAGE_STATUS_META[record.status].color} variant="outlined" className="m-0">
          {USAGE_STATUS_META[record.status].label}
        </Tag>
      </span>
    )
  },
  {
    title: "Số lượng",
    key: "quantity",
    dataIndex: "quantity",
    width: 80,
    align: "right",
    render: (value: number) => formatNumber(value)
  },
  {
    title: "Giá trị áp dụng",
    key: "appliedAmount",
    dataIndex: "appliedAmount",
    width: 130,
    align: "right",
    render: (value: number) => formatMoney(value)
  },
  {
    title: "Nhân viên",
    key: "staffName",
    dataIndex: "staffName",
    width: 120,
    render: (value?: string | null) => value || "--"
  }
];

const VoucherImageFigure = ({
  position,
  image,
  batchCode
}: {
  position: number;
  image: PaperVoucherImage;
  batchCode: string;
}) => (
  // Khung bọc tự căn giữa ảnh; không dùng `rootClassName` của Image vì antd 6 gộp nó vào preview.
  <figure className="m-0 flex min-w-0 flex-col gap-1.5">
    <figcaption
      className="truncate text-xs text-slate-500 dark:text-slate-400"
      title={image.fileName ?? undefined}
    >
      {`Ảnh ${position}`}
      {image.fileName ? ` · ${image.fileName}` : ""}
    </figcaption>
    <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg border border-app-border bg-slate-50 dark:bg-white/5">
      <Image
        src={image.url}
        alt={`Ảnh ${position} voucher ${batchCode}`}
        height={158}
        className="object-contain"
      />
    </div>
  </figure>
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
      label: "Thời hạn",
      children: `${batch.validFrom ? formatPaperVoucherDate(batch.validFrom) : "--"} → ${batch.expiresAt ? formatPaperVoucherDate(batch.expiresAt) : PAPER_VOUCHER_NO_EXPIRY_LABEL}`
    },
    { key: "note", label: "Ghi chú", children: batch.note || "--", span: 2 },
    { key: "createdAt", label: "Ngày tạo", children: formatDateTime(batch.createdAt) },
    { key: "updatedAt", label: "Cập nhật lần cuối", children: formatDateTime(batch.updatedAt) }
  ];

  const statItems: DescriptionsProps["items"] = [
    {
      key: "total",
      label: "Phát hành",
      children: `${formatNumber(batch.totalQuantity)} phiếu · ${formatMoney(amounts.totalFaceValue)}`
    },
    {
      key: "used",
      label: "Đã sử dụng",
      children: `${formatNumber(batch.usedCount)} phiếu · ${formatMoney(amounts.usedFaceValue)}`
    },
    {
      key: "remaining",
      label: "Chưa ghi nhận sử dụng",
      children: `${formatNumber(amounts.remainingQuantity)} phiếu · ${formatMoney(amounts.remainingFaceValue)}`
    }
  ];

  return (
    <Modal
      open={open}
      title={`Chi tiết lô ${batch.batchCode}`}
      onCancel={() => onOpenChange(false)}
      footer={<Button onClick={() => onOpenChange(false)}>Đóng</Button>}
      width={720}
      destroyOnHidden
    >
      <div className="flex flex-col gap-4">
        {loadError && (
          <Alert
            type="error"
            showIcon
            title={getApiErrorMessage(loadError, "Không tải được thông tin lô voucher")}
          />
        )}
        <Descriptions size="small" bordered column={2} items={infoItems} />
        <section>
          <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Hình ảnh voucher
          </h4>
          {batch.images?.length ? (
            <Image.PreviewGroup>
              <div className="grid grid-cols-2 gap-3">
                {batch.images.map((image, index) => (
                  <VoucherImageFigure
                    key={image.url}
                    position={index + 1}
                    image={image}
                    batchCode={batch.batchCode}
                  />
                ))}
              </div>
            </Image.PreviewGroup>
          ) : (
            <div className="rounded-lg border border-app-border py-2">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có hình ảnh voucher" />
            </div>
          )}
        </section>
        <section>
          <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Thống kê sử dụng
          </h4>
          <Descriptions size="small" bordered column={1} items={statItems} />
        </section>
        <section>
          <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Lịch sử sử dụng
          </h4>
          {usages.length > 0 ? (
            <Table<PaperVoucherUsage>
              rowKey="id"
              size="small"
              bordered
              pagination={false}
              loading={isFetchingUsages}
              dataSource={usages}
              columns={USAGE_COLUMNS}
              scroll={{ y: 200 }}
            />
          ) : (
            <div className="rounded-lg border border-app-border py-2">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lượt sử dụng" />
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
};

export default PaperVoucherDetailDialog;
