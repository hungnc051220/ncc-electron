import { MoreOutlined } from "@ant-design/icons";
import { sharingRatePaymentsHistoryApi } from "@renderer/api/sharingRatePaymentsHistory.api";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import RefreshButton from "@renderer/components/RefreshButton";
import { sharingRatePaymentsHistoryKeys } from "@renderer/hooks/sharingRatePaymentsHistory/keys";
import { useSharingRatePaymentsHistory } from "@renderer/hooks/sharingRatePaymentsHistory/useSharingRatePaymentsHistory";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import {
  compareNumber,
  compareText,
  filterEmptyValues,
  formatMoney,
  formatNumber
} from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { SharingRatePaymentHistoryProps } from "@shared/types";
import type { TableProps } from "antd";
import { Button, Dropdown, Table } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { DownloadIcon, PlusIcon, SquarePen, Trash2Icon } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RevenueSharingFilterValues } from "../../types";
import Filter from "../Filter";
import { exportPaymentScheduleListExcel } from "./ExportListExcel";
import PaymentScheduleDialog from "./PaymentScheduleDialog";

export interface PaymentScheduleSummaryItem {
  manufacturerId: number;
  filmId: number;
  manufacturerName?: string;
  filmName?: string;
  premieredDay?: string;
  paymentCount: number;
  totalPaidAmount: number;
  itemId: number;
}

interface PaymentScheduleTabProps {
  onActionsChange?: (actions: ReactNode) => void;
}

const PaymentScheduleTab = ({ onActionsChange }: PaymentScheduleTabProps) => {
  const { message, modal } = useAntdApp();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const canCreate = can("revenue_sharing", "create");
  const canUpdate = can("revenue_sharing", "update");
  const canDelete = can("revenue_sharing", "delete");
  const canExport = can("revenue_sharing", "export");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPaymentSchedule, setSelectedPaymentSchedule] =
    useState<PaymentScheduleSummaryItem | null>(null);
  const [filterValues, setFilterValues] = useState<RevenueSharingFilterValues>({});

  const params = useMemo(() => {
    const { dateRange, ...rest } = filterValues;
    const filtered = filterEmptyValues(rest as Record<string, unknown>);

    if (dateRange && dateRange.length === 2) {
      filtered.fromDate = dayjs(dateRange[0]).startOf("day").format();
      filtered.toDate = dayjs(dateRange[1]).endOf("day").format();
    }

    return {
      current: 1,
      pageSize: 1000,
      manufacturerId: filtered.manufacturerId as number | undefined,
      filmId: filtered.filmId as number | undefined,
      fromDate: filtered.fromDate as string | undefined,
      toDate: filtered.toDate as string | undefined
    };
  }, [filterValues]);

  const { data: paymentSchedules, isFetching, refetch } = useSharingRatePaymentsHistory(params);

  const groupedPaymentSchedules = useMemo(() => {
    const data = paymentSchedules?.data ?? [];
    const grouped = new Map<number, PaymentScheduleSummaryItem>();

    data.forEach((item: SharingRatePaymentHistoryProps) => {
      const existing = grouped.get(item.filmId);

      if (!existing) {
        grouped.set(item.filmId, {
          itemId: item.itemId,
          manufacturerId: item.manufacturerId,
          filmId: item.filmId,
          manufacturerName: item.manufacturerName,
          filmName: item.filmName,
          premieredDay: item.premieredDay,
          paymentCount: 1,
          totalPaidAmount: item.paidAmount
        });
        return;
      }

      grouped.set(item.filmId, {
        ...existing,
        paymentCount: existing.paymentCount + 1,
        totalPaidAmount: existing.totalPaidAmount + item.paidAmount
      });
    });

    return Array.from(grouped.values());
  }, [paymentSchedules?.data]);

  const totalPaidAmount = useMemo(
    () => groupedPaymentSchedules.reduce((total, item) => total + item.totalPaidAmount, 0),
    [groupedPaymentSchedules]
  );

  const handleAdd = useCallback(() => {
    setSelectedPaymentSchedule(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: PaymentScheduleSummaryItem) => {
    setSelectedPaymentSchedule(item);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedPaymentSchedule(null);
    }
  }, []);

  const handleExportList = useCallback(async () => {
    const messageKey = "export-payment-schedule-list";
    const [fromDate, toDate] = filterValues.dateRange ?? [];

    message.open({
      key: messageKey,
      type: "loading",
      content: "Đang xuất file excel...",
      duration: 0
    });

    try {
      const result = await exportPaymentScheduleListExcel({
        data: groupedPaymentSchedules,
        totalPaidAmount,
        fromDate,
        toDate
      });

      if (result.canceled) {
        message.open({
          key: messageKey,
          type: "warning",
          content: "Bạn đã hủy lưu file excel"
        });
        return;
      }

      message.open({
        key: messageKey,
        type: "success",
        content: "Xuất file excel thành công"
      });
    } catch (error) {
      message.open({
        key: messageKey,
        type: "error",
        content: getApiErrorMessage(error, "Xuất excel thất bại")
      });
    }
  }, [filterValues.dateRange, groupedPaymentSchedules, message, totalPaidAmount]);

  const handleDelete = useCallback(
    (item: PaymentScheduleSummaryItem) => {
      modal.confirm({
        title: "Xóa tiến độ thanh toán",
        content: `Bạn có chắc chắn muốn xóa tất cả ${item.paymentCount} lần thanh toán của phim "${item.filmName ?? item.filmId}" không?`,
        okText: "Xóa",
        okButtonProps: {
          danger: true
        },
        cancelText: "Hủy",
        async onOk() {
          try {
            const response = await sharingRatePaymentsHistoryApi.getAll({
              current: 1,
              pageSize: 1000,
              filmId: item.filmId
            });
            const itemIds = response.data.map((paymentItem) => paymentItem.itemId);

            if (!itemIds.length) {
              message.warning("Không tìm thấy lần thanh toán để xóa");
              return;
            }

            await Promise.all(
              itemIds.map((itemId) => sharingRatePaymentsHistoryApi.delete(itemId))
            );
            await queryClient.invalidateQueries({
              queryKey: sharingRatePaymentsHistoryKeys.all
            });
            message.success("Xóa tiến độ thanh toán thành công");
          } catch (error) {
            message.error(getApiErrorMessage(error, "Xóa tiến độ thanh toán thất bại"));
            throw error;
          }
        }
      });
    },
    [message, modal, queryClient]
  );

  const actionItems = [
    ...(canUpdate ? [{ key: "update", icon: <SquarePen size={16} />, label: "Cập nhật" }] : []),
    ...(canDelete
      ? [{ key: "delete", danger: true, icon: <Trash2Icon size={16} />, label: "Xóa" }]
      : [])
  ];

  const columns: TableProps<PaymentScheduleSummaryItem>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Hãng phim",
      key: "manufacturerName",
      dataIndex: "manufacturerName",
      render: (_, record) => record.manufacturerName ?? record.manufacturerId,
      sorter: (a, b) => compareText(a.manufacturerName, b.manufacturerName)
    },
    {
      title: "Tên phim",
      key: "filmName",
      dataIndex: "filmName",
      render: (_, record) => record.filmName ?? record.filmId,
      sorter: (a, b) => compareText(a.filmName, b.filmName)
    },
    {
      title: "Ngày phát hành",
      key: "premieredDay",
      dataIndex: "premieredDay",
      sorter: (a, b) => dayjs(a.premieredDay).valueOf() - dayjs(b.premieredDay).valueOf(),
      render: (value?: string) => (value ? dayjs(value).format("DD/MM/YYYY") : "--")
    },
    {
      title: "Số lần thanh toán",
      key: "paymentCount",
      dataIndex: "paymentCount",
      sorter: (a, b) => compareNumber(a.paymentCount, b.paymentCount),
      align: "right"
    },
    {
      title: "Tổng tiền đã thanh toán",
      key: "totalPaidAmount",
      dataIndex: "totalPaidAmount",
      sorter: (a, b) => compareNumber(a.totalPaidAmount, b.totalPaidAmount),
      render: (value: number) => formatMoney(value),
      align: "right"
    },
    ...(actionItems.length
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: PaymentScheduleSummaryItem) => (
              <Dropdown
                menu={{
                  items: actionItems,
                  onClick: (e) => {
                    if (e.key === "update") {
                      handleEdit(record);
                      return;
                    }

                    if (e.key === "delete") {
                      handleDelete(record);
                    }
                  }
                }}
                arrow
                trigger={["click"]}
              >
                <MoreOutlined />
              </Dropdown>
            ),
            align: "center" as const,
            fixed: "right" as const
          }
        ]
      : [])
  ];

  const tabBarActions = useMemo(
    () => (
      <div className="mb-1 flex items-center justify-end gap-2">
        <Filter filterValues={filterValues} onSearch={setFilterValues} />
        <RefreshButton loading={isFetching} onRefresh={() => refetch()} />
        {canExport && (
          <Button
            variant="solid"
            color="green"
            disabled={!groupedPaymentSchedules.length}
            onClick={handleExportList}
            icon={<DownloadIcon size={16} />}
          >
            Xuất excel
          </Button>
        )}
        {canCreate && (
          <Button type="primary" onClick={handleAdd} icon={<PlusIcon size={16} />}>
            Thêm mới
          </Button>
        )}
      </div>
    ),
    [
      canCreate,
      canExport,
      filterValues,
      groupedPaymentSchedules.length,
      handleAdd,
      handleExportList,
      isFetching,
      refetch
    ]
  );

  useEffect(() => {
    onActionsChange?.(tabBarActions);
  }, [onActionsChange, tabBarActions]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AutoHeightTable
        rowKey={(record) => record.filmId}
        dataSource={groupedPaymentSchedules}
        columns={columns}
        bordered
        size="small"
        loading={isFetching}
        pagination={{
          pageSize: 20,
          total: groupedPaymentSchedules.length,
          size: "middle",
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
        summary={
          groupedPaymentSchedules.length
            ? () => {
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5} align="center" className="font-bold">
                      Tổng
                    </Table.Summary.Cell>
                    <Table.Summary.Cell align="right" index={5} className="font-bold">
                      {formatMoney(totalPaidAmount)}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }
            : undefined
        }
      />

      {dialogOpen && (
        <PaymentScheduleDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingPaymentSchedule={selectedPaymentSchedule}
        />
      )}
    </div>
  );
};

export default PaymentScheduleTab;
