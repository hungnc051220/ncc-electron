import Icon from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import { paperVoucherKeys } from "@renderer/hooks/paperVouchers/keys";
import {
  useDeletePaperVoucherBatch,
  useSetPaperVoucherBatchLocked
} from "@renderer/hooks/paperVouchers/usePaperVoucherBatchMutations";
import {
  usePaperVoucherBatches,
  usePaperVoucherBatchPage,
  usePaperVoucherSummary
} from "@renderer/hooks/paperVouchers/usePaperVoucherBatches";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { getSafeApiErrorMessage } from "@renderer/lib/apiError";
import { usePermission } from "@renderer/permissions/usePermission";
import type { PaperVoucherBatch, PaperVoucherBatchQuery } from "@shared/types";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Empty } from "antd";
import { PlusIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router";
import PaperVoucherBatchDialog from "./components/PaperVoucherBatchDialog";
import PaperVoucherDetailDialog from "./components/PaperVoucherDetailDialog";
import PaperVoucherFilter from "./components/PaperVoucherFilter";
import PaperVoucherStats from "./components/PaperVoucherStats";
import PaperVoucherTable, { type PaperVoucherTableSort } from "./components/PaperVoucherTable";
import {
  getDistinctSortedValues,
  getVietnamBusinessDate,
  hasPaperVoucherFilters,
  summarizePaperVoucherBatches,
  toPaperVoucherBatchFilterQuery,
  type PaperVoucherFilterValues
} from "./paperVoucher.utils";
import { PAPER_VOUCHER_NO_PERMISSION_MESSAGE } from "./paperVoucherMessages";
import { resolvePaperVoucherPermissions } from "./paperVoucherPermissions";

type DialogState =
  | { type: "form"; batch: PaperVoucherBatch | null }
  | { type: "detail"; batch: PaperVoucherBatch }
  | null;

const EMPTY_SUMMARY = summarizePaperVoucherBatches([]);
// Tham chiếu cố định: mảng mặc định mới mỗi lần render làm các memo/effect phía dưới chạy lại liên tục.
const EMPTY_BATCHES: PaperVoucherBatch[] = [];

const PaperVouchersPage = () => {
  const { can } = usePermission();
  const permissions = useMemo(() => resolvePaperVoucherPermissions(can), [can]);
  const { message, modal } = useAntdApp();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PaperVoucherFilterValues>({});
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<PaperVoucherTableSort>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  const query = useMemo<PaperVoucherBatchQuery>(
    () => ({
      ...toPaperVoucherBatchFilterQuery(filters),
      current,
      pageSize,
      sort: sort ? `${sort.field}.${sort.order === "ascend" ? "asc" : "desc"}` : undefined
    }),
    [current, filters, pageSize, sort]
  );

  const {
    data: page,
    error: pageError,
    isFetching: isFetchingPage,
    isPlaceholderData
  } = usePaperVoucherBatchPage(query, permissions.list);
  const { data: summary, isFetching: isFetchingSummary } = usePaperVoucherSummary(permissions.list);
  // Toàn bộ lô chỉ dùng để dựng lựa chọn bộ lọc mệnh giá/HSD.
  const { data: batches = EMPTY_BATCHES } = usePaperVoucherBatches(permissions.list);
  const setLocked = useSetPaperVoucherBatchLocked();
  const deleteBatch = useDeletePaperVoucherBatch();
  const isFetching = isFetchingPage || isFetchingSummary;

  // Ngày nghiệp vụ VN tính lại mỗi lần render, trạng thái lô không lưu cứng.
  const today = getVietnamBusinessDate();

  const refetch = useCallback(
    () => queryClient.refetchQueries({ queryKey: paperVoucherKeys.all, type: "active" }),
    [queryClient]
  );

  // Xóa lô cuối của trang cuối: lùi về trang cuối còn dữ liệu.
  useEffect(() => {
    if (!page || isPlaceholderData || page.data.length || current === 1) return;
    setCurrent(Math.max(1, Math.ceil(page.total / pageSize)));
  }, [current, isPlaceholderData, page, pageSize]);

  const faceValues = useMemo(
    () => getDistinctSortedValues(batches.map((batch) => batch.faceValue)),
    [batches]
  );
  const expiryDates = useMemo(
    () =>
      getDistinctSortedValues(
        batches.flatMap((batch) => (batch.expiresAt ? [batch.expiresAt] : []))
      ),
    [batches]
  );
  const hasNoExpiryBatch = batches.some((batch) => !batch.expiresAt);

  const denyIfMissing = useCallback(
    (allowed: boolean) => {
      if (allowed) return false;
      message.error(PAPER_VOUCHER_NO_PERMISSION_MESSAGE);
      return true;
    },
    [message]
  );

  const handleCreate = useCallback(() => {
    if (denyIfMissing(permissions.create)) return;
    setDialog({ type: "form", batch: null });
  }, [denyIfMissing, permissions.create]);

  const handleEdit = (batch: PaperVoucherBatch) => {
    if (denyIfMissing(permissions.update)) return;
    setDialog({ type: "form", batch });
  };

  const handleView = (batch: PaperVoucherBatch) => {
    if (denyIfMissing(permissions.view)) return;
    setDialog({ type: "detail", batch });
  };

  const handleToggleLock = (batch: PaperVoucherBatch) => {
    if (denyIfMissing(permissions.update)) return;

    const nextLocked = !batch.isLocked;
    modal.confirm({
      title: nextLocked ? "Xác nhận khóa lô voucher" : "Xác nhận mở khóa lô voucher",
      content: nextLocked
        ? `Lô ${batch.batchCode} sẽ không được áp dụng cho tới khi mở khóa. Lịch sử sử dụng vẫn được giữ nguyên.`
        : `Lô ${batch.batchCode} sẽ được áp dụng lại nếu còn hạn và còn số lượng.`,
      okText: nextLocked ? "Khóa lô" : "Mở khóa",
      cancelText: "Hủy",
      okButtonProps: { danger: nextLocked },
      onOk: () =>
        setLocked
          .mutateAsync({ id: batch.id, isLocked: nextLocked })
          .then(() => {
            message.success(nextLocked ? "Đã khóa lô voucher" : "Đã mở khóa lô voucher");
          })
          .catch((error: unknown) => {
            message.error(getSafeApiErrorMessage(error, "Cập nhật trạng thái khóa thất bại"));
          })
    });
  };

  const handleDelete = (batch: PaperVoucherBatch) => {
    if (denyIfMissing(permissions.delete)) return;

    if (batch.usedCount > 0) {
      message.warning("Lô đã có lượt sử dụng, không thể xóa. Hãy khóa lô để giữ lịch sử đối soát");
      return;
    }

    modal.confirm({
      title: "Xác nhận xóa lô voucher",
      content: `Bạn có chắc chắn muốn xóa lô ${batch.batchCode} - ${batch.name}? Thao tác không thể thu hồi.`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () =>
        deleteBatch
          .mutateAsync(batch.id)
          .then(() => {
            message.success("Đã xóa lô voucher");
          })
          .catch((error: unknown) => {
            message.error(getSafeApiErrorMessage(error, "Xóa lô voucher thất bại"));
          })
    });
  };

  const handleFiltersChange = useCallback((nextFilters: PaperVoucherFilterValues) => {
    setFilters(nextFilters);
    setCurrent(1);
  }, []);

  const handlePaginationChange = (nextPage: number, size: number) => {
    setCurrent(nextPage);
    setPageSize(size);
  };

  const handleSortChange = (nextSort: PaperVoucherTableSort) => {
    setSort(nextSort);
    setCurrent(1);
  };

  // Route guard đã chặn khi thiếu quyền truy cập; đây là lớp phòng thủ cuối.
  if (!permissions.access) {
    return <Navigate to="/403" replace />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4 pb-3">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          <>
            {permissions.list && (
              <>
                <PaperVoucherFilter
                  filters={filters}
                  onChange={handleFiltersChange}
                  faceValues={faceValues}
                  expiryDates={expiryDates}
                  hasNoExpiryBatch={hasNoExpiryBatch}
                />
                <RefreshButton loading={isFetching} onRefresh={() => refetch()} />
              </>
            )}
            {permissions.create && (
              <Button type="primary" onClick={handleCreate} icon={<Icon component={PlusIcon} />}>
                Tạo lô Voucher
              </Button>
            )}
          </>
        }
      />

      {permissions.list ? (
        <>
          <PaperVoucherStats
            summary={summary ?? EMPTY_SUMMARY}
            activeBatchCount={summary?.countByStatus.active ?? 0}
          />
          <PaperVoucherTable
            dataSource={page?.data ?? []}
            total={page?.total ?? 0}
            loading={isFetchingPage}
            today={today}
            permissions={permissions}
            hasFilters={hasPaperVoucherFilters(filters)}
            loadError={
              pageError
                ? getSafeApiErrorMessage(pageError, "Không tải được danh sách lô voucher")
                : null
            }
            current={current}
            pageSize={pageSize}
            sort={sort}
            onSortChange={handleSortChange}
            onPaginationChange={handlePaginationChange}
            onView={handleView}
            onEdit={handleEdit}
            onToggleLock={handleToggleLock}
            onDelete={handleDelete}
          />
        </>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Bạn không có quyền xem danh sách voucher giấy"
          />
        </div>
      )}

      {dialog?.type === "form" && (
        <PaperVoucherBatchDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          editingBatch={dialog.batch}
          canSubmit={dialog.batch ? permissions.update : permissions.create}
        />
      )}
      {dialog?.type === "detail" && (
        <PaperVoucherDetailDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          batch={dialog.batch}
          today={today}
        />
      )}
    </div>
  );
};

export default PaperVouchersPage;
