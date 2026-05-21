import { ExportOutlined, ReloadOutlined, SyncOutlined } from "@ant-design/icons";
import { cancelTicketsApi } from "@renderer/api/cancelTickets.api";
import { ordersApi } from "@renderer/api/orders.api";
import { OrderStatusBadge } from "@renderer/components/OrderStatusBadge";
import RefundStatusBadge from "@renderer/features/refunds/components/RefundStatusBadge";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { useOrderDetail } from "@renderer/hooks/orders/useOrderDetail";
import { useOrdersByScreening } from "@renderer/hooks/orders/useOrdersByScreening";
import { useUpdateOrder } from "@renderer/hooks/orders/useUpdateOrder";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import {
  cn,
  extractSeatValues,
  formatMoney,
  formatPaymentMethod,
  resolvePaymentType,
  formatSeatValues,
  resolveOrderPaymentStatus
} from "@renderer/lib/utils";
import {
  OrderDetailProps,
  OrderItem,
  OrderResponseProps,
  OrderStatus,
  PaymentStatus,
  PaymentType,
  CancellationTicketProps
} from "@shared/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Checkbox, Modal, Popover, Table, Tag, Typography } from "antd";
import type { PopoverProps, TableColumnsType } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { usePermission } from "@renderer/permissions/usePermission";

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrderId?: number | null;
  selectedItem?: OrderDetailProps | null;
}

type SeatAvailability = {
  isApplicable: boolean;
  conflictingSeats: string[];
};

type SeatKeyCollection = {
  indexKeys: Set<string>;
  valueKeys: Set<string>;
  labels: Set<string>;
};

const splitSeatList = (value?: string | null) =>
  (value ?? "")
    .split(",")
    .map((seat) => seat.trim())
    .filter(Boolean);

const ellipsisPopoverProps: Pick<
  PopoverProps,
  "mouseEnterDelay" | "mouseLeaveDelay" | "placement" | "styles" | "trigger"
> = {
  trigger: "hover",
  placement: "topRight",
  mouseEnterDelay: 0.15,
  mouseLeaveDelay: 0.2,
  styles: {
    root: {
      maxWidth: 640
    },
    content: {
      maxHeight: 220,
      overflowY: "auto",
      whiteSpace: "normal",
      wordBreak: "break-word"
    }
  }
};

const renderEllipsisPopover = (content: string, children: ReactNode) => {
  if (!content) {
    return children;
  }

  return (
    <Popover {...ellipsisPopoverProps} content={content}>
      <div className="block min-w-0 cursor-help">{children}</div>
    </Popover>
  );
};

const renderEllipsisText = (value?: string | null) => {
  const text = value || "-";

  return (
    <div className="min-w-0 overflow-hidden">
      {renderEllipsisPopover(
        value || "",
        <Typography.Text className="max-w-60" ellipsis>
          {text}
        </Typography.Text>
      )}
    </div>
  );
};

const renderMultilineEllipsisText = (value?: string | null) => {
  const text = value || "-";

  return renderEllipsisPopover(
    value || "",
    <Typography.Paragraph
      className="mb-0! w-full max-w-full text-right text-sm! font-medium! text-slate-900! dark:text-slate-100!"
      ellipsis={true}
    >
      {text}
    </Typography.Paragraph>
  );
};

const getSeatKeysFromItems = (items?: OrderItem[] | null, planScreenId?: number | null) =>
  (items ?? []).reduce<SeatKeyCollection>(
    (acc, item) => {
      if (planScreenId && item.planScreenId !== planScreenId) {
        return acc;
      }

      ([1, 2, 3] as const).forEach((floor) => {
        const indexKey = `listChairIndexF${floor}` as const;
        const valueKey = `listChairValueF${floor}` as const;
        const seatIndexes = splitSeatList(item[indexKey]);
        const seatValues = splitSeatList(item[valueKey]);

        seatIndexes.forEach((seatIndex) => {
          acc.indexKeys.add(`${floor}-${seatIndex}`);
        });

        seatValues.forEach((seatValue) => {
          acc.valueKeys.add(`${floor}-${seatValue}`);
          acc.labels.add(seatValue);
        });

        if (seatValues.length === 0) {
          seatIndexes.forEach((seatIndex) => {
            acc.labels.add(`Tầng ${floor} - ${seatIndex}`);
          });
        }
      });

      return acc;
    },
    {
      indexKeys: new Set(),
      valueKeys: new Set(),
      labels: new Set()
    }
  );

const isReleasedOrder = (order: OrderResponseProps) => {
  const paymentStatusId = resolveOrderPaymentStatus(order);

  return (
    order.orderStatusId === OrderStatus.FAIL ||
    order.orderStatusId === OrderStatus.CANCELLED ||
    paymentStatusId === PaymentStatus.FAIL ||
    paymentStatusId === PaymentStatus.VOIDED
  );
};

const OrderDetailDialog = ({
  open,
  onOpenChange,
  selectedOrderId,
  selectedItem
}: OrderDialogProps) => {
  const { message, modal } = useAntdApp();

  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const { posName } = useSettingPosStore();
  const [isChangingToSuccess, setIsChangingToSuccess] = useState(false);
  const [isCheckingTransaction, setIsCheckingTransaction] = useState(false);
  const [isExportingETicket, setIsExportingETicket] = useState(false);
  const updateOrder = useUpdateOrder();
  const {
    data: orderDetail,
    isFetching: isFetchingOrderDetail,
    refetch: refetchOrderDetail
  } = useOrderDetail(selectedOrderId ?? selectedItem?.order.id ?? 0);

  const currentDetail = orderDetail ?? selectedItem ?? null;
  const currentOrder = currentDetail?.order;
  const currentOrderId = currentOrder?.id ?? 0;
  const currentPlanScreeningId =
    currentDetail?.planScreening?.id ?? currentOrder?.planScreenId ?? 0;
  const { refetch: refetchOrdersByScreening } = useOrdersByScreening(currentPlanScreeningId);
  const currentItems = useMemo(() => currentOrder?.items ?? [], [currentOrder?.items]);
  const customerName = [currentOrder?.customerFirstName, currentOrder?.customerLastName]
    .filter(Boolean)
    .join(" ");
  const totalTickets = currentItems.reduce((sum, item) => sum + item.quantity, 0);
  const isRefundOrder = currentOrder?.refundStatusId != null;
  const isCancelOrder =
    currentOrder?.orderStatusId === OrderStatus.CANCELLED ||
    currentOrder?.orderStatusId === OrderStatus.FAIL;
  const { data: cancelTicketsResponse, isFetching: isFetchingCancelTickets } = useQuery({
    queryKey: ["order-detail-cancel-tickets", currentOrderId],
    queryFn: () =>
      cancelTicketsApi.getAll({
        current: 1,
        pageSize: 100,
        orderId: currentOrderId
      }),
    enabled: open && !!currentOrderId
  });
  const cancelTickets = useMemo<CancellationTicketProps[]>(
    () => cancelTicketsResponse?.data ?? [],
    [cancelTicketsResponse?.data]
  );
  const totalCancelledTickets = useMemo(
    () => cancelTickets.reduce((sum, ticket) => sum + (ticket.quantity || 0), 0),
    [cancelTickets]
  );

  const hasCancelTickets = cancelTickets.length > 0;
  const isInvitationOrder = !!currentOrder?.isInvitation;
  const orderTypeBadge = isInvitationOrder
    ? {
        label: "Giấy mời",
        className:
          "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200"
      }
    : currentOrder?.isContract
      ? {
          label: "Hợp đồng",
          className:
            "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
        }
      : null;
  const isPastProjectDate = currentDetail?.planScreening?.projectDate
    ? dayjs().isAfter(dayjs(currentDetail.planScreening.projectDate).endOf("day"))
    : false;
  const canShowSwapSeatsButton =
    !!currentOrder &&
    !isCancelOrder &&
    !isInvitationOrder &&
    !currentOrder.isContract &&
    !isRefundOrder &&
    !isPastProjectDate;

  const canShowChangeSuccessButton =
    !!currentOrder &&
    // !isCancelOrder &&
    currentOrder.orderStatusId !== OrderStatus.COMPLETED &&
    !isInvitationOrder &&
    !currentOrder.isContract &&
    !isRefundOrder &&
    !isPastProjectDate;

  const canExport = can("invoices", "export");
  const canExportETicket =
    currentOrder?.orderStatusId === OrderStatus.COMPLETED && canExport && !currentOrder.eTicketUrl;

  const isVietQrOrder =
    resolvePaymentType(currentOrder?.paymentMethodSystemName) === PaymentType.VIETQR;
  const resolvedPaymentStatusId = resolveOrderPaymentStatus(currentOrder);

  const invitationTicket = currentOrder?.invitationTickets;

  const ticketPromotions = useMemo(() => {
    const map = new Map<
      number,
      {
        id: number;
        name: string;
        type: string;
        rate: number;
        amount: number;
        quantity: number;
        totalDiscount: number;
        seats: string[];
      }
    >();

    currentItems.forEach((item) => {
      if (!item.discount?.id) {
        return;
      }

      const existing = map.get(item.discount.id);
      const seats = extractSeatValues([item]);

      if (existing) {
        existing.quantity += item.quantity;
        existing.totalDiscount += item.discountAmountInclTax || 0;
        existing.seats.push(...seats);
        return;
      }

      map.set(item.discount.id, {
        id: item.discount.id,
        name: item.discount.discountName,
        type: item.discount.discountType,
        rate: item.discount.discountRate,
        amount: item.discount.discountAmount,
        quantity: item.quantity,
        totalDiscount: item.discountAmountInclTax || 0,
        seats
      });
    });

    return Array.from(map.values());
  }, [currentItems]);

  const isU22Voucher = currentOrder?.voucherCode === "U22Ticket";

  const pricePointReward = (currentOrder?.pointReward || 0) * (currentOrder?.pointRewardBase || 0);

  const promotionMode =
    isU22Voucher || currentOrder?.campaign
      ? "campaign"
      : ticketPromotions.length > 0
        ? "ticket"
        : "none";

  const getChairs = () => {
    return formatSeatValues(currentItems);
  };

  const getCancelTicketChairs = (ticket: CancellationTicketProps) =>
    [ticket.cancelChairValueF1, ticket.cancelChairValueF2, ticket.cancelChairValueF3]
      .flatMap((value) => splitSeatList(value))
      .join(", ");

  const cancelTicketColumns = useMemo<TableColumnsType<CancellationTicketProps>>(
    () => [
      {
        title: "Lần",
        key: "index",
        width: 64,
        align: "center",
        render: (_value, _record, index) => cancelTickets.length - index
      },
      {
        title: "Thời gian",
        dataIndex: "createdOnUtc",
        key: "createdOnUtc",
        width: 150,
        render: (value?: string) => (value ? dayjs(value).format("HH:mm DD/MM/YYYY") : "-")
      },
      {
        title: "Người hủy",
        dataIndex: "canceller",
        key: "fullName",
        width: 140,
        render: (canceller) =>
          [canceller?.customerFirstName, canceller?.customerLastName].filter(Boolean).join(" ")
      },
      {
        title: "Số vé",
        dataIndex: "quantity",
        key: "quantity",
        width: 70,
        align: "right",
        render: (value?: number) => value || 0
      },
      {
        title: "Ghế hủy",
        key: "chairs",
        width: 180,
        render: (_value, record) => renderEllipsisText(getCancelTicketChairs(record))
      },
      {
        title: "Lý do",
        dataIndex: "reason",
        key: "reason",
        width: 220,
        render: (value?: string) => renderEllipsisText(value)
      }
    ],
    [cancelTickets.length]
  );

  const getPromotionValue = (type: string, rate: number, amount: number) => {
    if (rate > 0) {
      return `-${rate}%`;
    }

    if (amount > 0) {
      return `-${formatMoney(amount)}`;
    }

    return type || "Ưu đãi đặc biệt";
  };

  const formatInvitationTicketLabel = (key: string) => {
    const labelMap: Record<string, string> = {
      receivedEmail: "Email nhận vé",
      createdAt: "Thời gian xuất vé",
      status: "Trạng thái",
      urlTicket: "Ảnh vé mời",
      createdBy: "Người tạo"
    };

    if (labelMap[key]) {
      return labelMap[key];
    }

    return key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/^./, (char) => char.toUpperCase());
  };

  const formatInvitationTicketValue = (key: string, value: unknown) => {
    if (value == null || value === "") {
      return "-";
    }

    if (typeof value === "boolean") {
      return value ? "Có" : "Không";
    }

    if (typeof value === "string") {
      const trimmedValue = value.trim();

      if (!trimmedValue) {
        return "-";
      }

      if (["createdAt", "updatedAt", "sentAt"].includes(key) && dayjs(trimmedValue).isValid()) {
        return dayjs(trimmedValue).format("HH:mm DD/MM/YYYY");
      }

      return trimmedValue;
    }

    if (typeof value === "number") {
      return value;
    }

    return JSON.stringify(value);
  };

  const renderInvitationTicketStatus = (status?: string | null) => {
    const normalizedStatus = status?.toLowerCase();
    const configMap: Record<string, { label: string; color: string; className: string }> = {
      new: {
        label: "Mới",
        color: "processing",
        className:
          "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300"
      },
      sent: {
        label: "Đã gửi",
        color: "success",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
      },
      failed: {
        label: "Gửi lỗi",
        color: "error",
        className:
          "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
      }
    };

    const config = normalizedStatus ? configMap[normalizedStatus] : undefined;

    return (
      <Tag
        color={config?.color ?? "default"}
        className={cn(
          "mr-0 rounded-full border px-3 py-1 text-xs font-semibold",
          config?.className
        )}
      >
        {config?.label ?? status ?? "-"}
      </Tag>
    );
  };

  const invitationTicketFields = useMemo(
    () =>
      invitationTicket
        ? (
            [
              ["receivedEmail", invitationTicket.receivedEmail],
              ["createdAt", invitationTicket.createdAt],
              ["status", invitationTicket.status],
              ["createdBy", invitationTicket.createdBy]
            ] as const
          ).filter(([, value]) => value != null && value !== "")
        : [],
    [invitationTicket]
  );

  const renderInfoRow = (
    label: string,
    value?: ReactNode,
    options?: {
      borderClassName?: string;
      valueClassName?: string;
      fallback?: ReactNode;
      stackedOnMobile?: boolean;
    }
  ) => (
    <div
      className={cn(
        options?.stackedOnMobile
          ? "grid grid-cols-1 items-start gap-2 border-b border-slate-100 py-2 last:border-b-0 md:grid-cols-[132px_minmax(0,1fr)] md:gap-4 dark:border-app-border"
          : "grid grid-cols-[96px_minmax(0,1fr)] items-start gap-4 border-b border-slate-100 py-2 last:border-b-0 dark:border-app-border",
        options?.borderClassName
      )}
    >
      <span className="whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={cn(
          "min-w-0 wrap-break-word text-right text-sm font-medium text-slate-900 dark:text-slate-100",
          options?.valueClassName
        )}
      >
        {value ?? options?.fallback ?? "-"}
      </span>
    </div>
  );

  const goToSwapSeats = () => {
    if (!currentDetail) return;

    modal.confirm({
      title: "Cảnh báo đổi ghế",
      content: "Đã tránh hiện tượng trùng ghế, bạn phải chọn lại toàn bộ ghế cho khách hàng",
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: () => {
        const searchParams = new URLSearchParams({
          callbackUrl: "/order-history/swap-seats",
          id: String(currentDetail.order.id),
          returnTo: `${location.pathname}${location.search}`,
          reopenOrderId: String(currentDetail.order.id)
        });

        if (currentDetail.planScreening?.projectDate) {
          searchParams.set(
            "date",
            dayjs(currentDetail.planScreening.projectDate).format("YYYY-MM-DD")
          );
        }

        if (currentDetail.planScreening?.id) {
          searchParams.set("autoOpenPlanScreening", String(currentDetail.planScreening.id));
        }

        navigate(`/showtimes?${searchParams.toString()}`);
      }
    });
  };

  const checkCurrentSeatsAvailability = async (): Promise<SeatAvailability> => {
    if (!currentOrder || !currentPlanScreeningId) {
      return {
        isApplicable: false,
        conflictingSeats: []
      };
    }

    const currentSeatKeys = getSeatKeysFromItems(currentOrder.items, currentPlanScreeningId);

    if (currentSeatKeys.indexKeys.size === 0 && currentSeatKeys.valueKeys.size === 0) {
      return {
        isApplicable: false,
        conflictingSeats: []
      };
    }

    const [ordersResult, selectingSnapshots] = await Promise.all([
      refetchOrdersByScreening(),
      ordersApi.getSelectingChairs(currentPlanScreeningId)
    ]);
    const conflictingSeats = new Set<string>();

    (ordersResult.data ?? []).forEach((order) => {
      if (order.id === currentOrder.id || isReleasedOrder(order)) {
        return;
      }

      const otherSeatKeys = getSeatKeysFromItems(order.items, currentPlanScreeningId);
      const hasConflict =
        Array.from(currentSeatKeys.indexKeys).some((seatKey) =>
          otherSeatKeys.indexKeys.has(seatKey)
        ) ||
        Array.from(currentSeatKeys.valueKeys).some((seatKey) =>
          otherSeatKeys.valueKeys.has(seatKey)
        );

      if (!hasConflict) {
        return;
      }

      currentSeatKeys.labels.forEach((seatLabel) => {
        conflictingSeats.add(seatLabel);
      });
    });

    selectingSnapshots
      .filter(
        (snapshot) =>
          snapshot.planScreenId === currentPlanScreeningId &&
          (!posName || snapshot.posName !== posName)
      )
      .forEach((snapshot) => {
        ([1, 2, 3] as const).forEach((floor) => {
          const key = `selectingChairIndexF${floor}` as const;
          splitSeatList(snapshot[key]).forEach((seatIndex) => {
            if (currentSeatKeys.indexKeys.has(`${floor}-${seatIndex}`)) {
              conflictingSeats.add(`Tầng ${floor} - ${seatIndex}`);
            }
          });
        });
      });

    return {
      isApplicable: conflictingSeats.size === 0,
      conflictingSeats: Array.from(conflictingSeats)
    };
  };

  const refreshOrderDetail = async () => {
    if (!currentOrder) return;

    const refreshed = await refetchOrderDetail();
    const latestOrderId = refreshed.data?.order.id ?? currentOrder.id;

    queryClient.invalidateQueries({ queryKey: ordersKeys.all });
    queryClient.invalidateQueries({ queryKey: ordersKeys.getDetail(latestOrderId) });

    return refreshed.data;
  };

  const onChangeStatusOrder = async () => {
    if (!currentOrder) return;

    try {
      setIsChangingToSuccess(true);
      if (resolvedPaymentStatusId === PaymentStatus.PAID) {
        goToSwapSeats();
        return;
      }

      message.warning("Đơn hàng chưa thanh toán thành công");
    } finally {
      setIsChangingToSuccess(false);
    }
  };

  const completeOrder = async (
    orderToUpdate: NonNullable<typeof currentOrder>,
    paymentStatusId: PaymentStatus = PaymentStatus.PAID
  ) => {
    await updateOrder.mutateAsync({
      id: orderToUpdate.id,
      dto: {
        orderStatusId: OrderStatus.COMPLETED,
        paymentStatusId,
        shippingStatusId: orderToUpdate.shippingStatusId
      }
    });

    await refreshOrderDetail();
  };

  const onMarkOrderSuccess = async () => {
    if (!currentOrder) return;

    modal.confirm({
      title: "Xác nhận chuyển trạng thái",
      content: (
        <span>
          Bạn có chắc chắn muốn chuyển đơn hàng với Mã đặt vé:{" "}
          <strong>{currentOrder.barCode ?? "-"}</strong> sang thành công không? Thao tác không thể
          thu hồi.
        </span>
      ),
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          setIsChangingToSuccess(true);
          const seatAvailability = await checkCurrentSeatsAvailability();

          if (!seatAvailability.isApplicable) {
            modal.confirm({
              title: "Ghế hiện tại không còn khả dụng",
              content: (
                <span>
                  Một hoặc nhiều ghế của đơn hàng đang bị đặt hoặc giữ chỗ bởi giao dịch khác
                  {seatAvailability.conflictingSeats.length > 0
                    ? `: ${seatAvailability.conflictingSeats.join(", ")}`
                    : ""}
                  . Vui lòng đổi ghế để hoàn tất đơn hàng.
                </span>
              ),
              okText: "Đổi ghế",
              cancelText: "Hủy",
              onOk: goToSwapSeats
            });
            return;
          }

          await completeOrder(currentOrder, PaymentStatus.PAID);
          message.success("Chuyển trạng thái đơn hàng thành công");
        } catch (error: unknown) {
          message.error(getApiErrorMessage(error, "Chuyển trạng thái đơn hàng thất bại"));
        } finally {
          setIsChangingToSuccess(false);
        }
      }
    });
  };

  const onCheckTransaction = async () => {
    if (!currentOrder) return;

    try {
      setIsCheckingTransaction(true);
      await ordersApi.checkTransaction({ orderId: currentOrder.id });

      const latestOrderDetail = await refreshOrderDetail();

      if (resolveOrderPaymentStatus(latestOrderDetail?.order) === PaymentStatus.PAID) {
        message.success("Giao dịch đã được ghi nhận thành công");
        return;
      }

      message.warning("Giao dịch chưa được ghi nhận thành công. Vui lòng kiểm tra lại.");
    } catch {
      message.error("Kiểm tra lại giao dịch thanh toán thất bại");
    } finally {
      setIsCheckingTransaction(false);
    }
  };

  const onExportETicket = async () => {
    if (!currentOrder) return;

    if (!canExportETicket) {
      message.warning("Chỉ được xuất vé điện tử khi đơn hàng đã hoàn thành");
      return;
    }

    try {
      setIsExportingETicket(true);
      await ordersApi.exportETicket({ orderId: currentOrder.id });
      await refreshOrderDetail();
      message.success("Xuất vé điện tử thành công");
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Xuất vé điện tử thất bại"));
    } finally {
      setIsExportingETicket(false);
    }
  };

  return (
    <Modal
      title="Thông tin vé bán"
      open={open}
      onCancel={() => onOpenChange(false)}
      width={1000}
      style={{ top: 20, paddingBottom: 20 }}
      cancelText="Đóng"
      footer={(_, { CancelBtn }) => (
        <>
          <CancelBtn />
          {canExportETicket && (
            <Button
              icon={<ExportOutlined />}
              onClick={() => void onExportETicket()}
              loading={isExportingETicket}
            >
              Xuất vé điện tử
            </Button>
          )}
          {canShowSwapSeatsButton && (
            <Button onClick={() => void onChangeStatusOrder()} disabled={isChangingToSuccess}>
              Đổi ghế
            </Button>
          )}
          {canShowChangeSuccessButton && (
            <Button
              variant="solid"
              color="green"
              onClick={() => void onMarkOrderSuccess()}
              loading={isChangingToSuccess}
            >
              Chuyển sang thành công
            </Button>
          )}
        </>
      )}
    >
      <div className="space-y-5 text-slate-900 dark:text-slate-100">
        <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_45%,#fff7ed_100%)] p-5 dark:border-app-border dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92)_0%,rgba(15,23,42,0.84)_48%,rgba(51,65,85,0.72)_100%)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Đơn hàng{" "}
                <span className="text-black dark:text-white">#{currentOrder?.id ?? "-"}</span>
                {orderTypeBadge && (
                  <span
                    className={cn(
                      "ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal",
                      orderTypeBadge.className
                    )}
                  >
                    {orderTypeBadge.label}
                  </span>
                )}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                Mã đặt vé: {currentOrder?.barCode ?? "-"}
              </h3>
              {!currentOrder?.isOnline && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Máy bán:{" "}
                  <span className="font-bold text-primary">
                    {currentOrder?.items[0]?.posName || "-"}
                  </span>
                </p>
              )}
            </div>

            {currentOrder && (
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void refreshOrderDetail()}
                loading={isFetchingOrderDetail && !isChangingToSuccess}
              >
                Làm mới dữ liệu
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-app-border dark:bg-app-bg-container dark:shadow-none">
            {isInvitationOrder ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      Thông tin giấy mời
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Chi tiết phát hành và gửi vé mời cho khách
                    </p>
                  </div>
                </div>

                {invitationTicket ? (
                  <div className="space-y-5">
                    <div className="grid gap-x-6 md:grid-cols-2">
                      <div>
                        {invitationTicketFields
                          .filter((_, index) => index % 2 === 0)
                          .map(([key, value]) =>
                            renderInfoRow(
                              formatInvitationTicketLabel(key),
                              key === "status"
                                ? renderInvitationTicketStatus(String(value))
                                : formatInvitationTicketValue(key, value),
                              {
                                valueClassName: key === "status" ? "" : undefined
                              }
                            )
                          )}
                      </div>
                      <div>
                        {invitationTicketFields
                          .filter((_, index) => index % 2 === 1)
                          .map(([key, value]) =>
                            renderInfoRow(
                              formatInvitationTicketLabel(key),
                              key === "status"
                                ? renderInvitationTicketStatus(String(value))
                                : formatInvitationTicketValue(key, value),
                              {
                                valueClassName: key === "status" ? "" : undefined
                              }
                            )
                          )}
                      </div>
                    </div>

                    {invitationTicket.urlTicket ? (
                      <div className="border-t border-slate-200 dark:border-app-border border-dashed">
                        <div className="my-3 flex items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                              Ảnh vé mời
                            </h4>
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
                          <div className="overflow-hidden rounded-2xl">
                            <img
                              src={invitationTicket.urlTicket}
                              alt="Ảnh vé mời"
                              className="h-full w-full object-contain"
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-400">
                    Chưa có dữ liệu
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      Khách hàng và thông tin vé
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Thông tin người mua và trạng thái gửi vé
                    </p>
                  </div>
                </div>

                <div className="grid gap-x-6 md:grid-cols-2">
                  <div>
                    {renderInfoRow("Tên khách hàng", customerName)}
                    {renderInfoRow("Email", currentOrder?.customerEmail)}
                    {renderInfoRow("Số điện thoại", currentOrder?.customerPhone)}
                    {renderInfoRow("Mã vé điện tử", currentOrder?.invNo)}
                    {renderInfoRow(
                      "Đường dẫn vé điện tử",
                      currentOrder?.eTicketUrl ? (
                        <a
                          href={currentOrder.eTicketUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline underline-offset-2 break-all hover:opacity-80"
                        >
                          {currentOrder.eTicketUrl}
                        </a>
                      ) : undefined,
                      {
                        valueClassName: "text-left md:text-right",
                        stackedOnMobile: true
                      }
                    )}
                  </div>
                  <div>
                    {renderInfoRow(
                      "Thời gian mua",
                      currentOrder?.createdOnUtc
                        ? dayjs(currentOrder.createdOnUtc).format("HH:mm DD/MM/YYYY")
                        : "-"
                    )}
                    {renderInfoRow(
                      "Kênh thanh toán",
                      formatPaymentMethod(currentOrder?.paymentMethodSystemName)
                    )}
                    <div className="border-b border-slate-100 py-2 dark:border-app-border">
                      <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                        Trạng thái gửi vé
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <Checkbox checked={!!currentOrder?.isEmailSent} disabled>
                          Đã gửi email
                        </Checkbox>
                        <Checkbox checked={!!currentOrder?.isSmsSent} disabled>
                          Đã gửi tin nhắn
                        </Checkbox>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 py-2">
                      <div>
                        <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                          Trạng thái đơn
                        </p>
                        {currentOrder?.orderStatusId && (
                          <OrderStatusBadge status={currentOrder.orderStatusId} type="order" />
                        )}
                      </div>

                      <div>
                        <div className="mb-1 flex itmes-center gap-2">
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Trạng thái thanh toán
                          </p>
                          {isVietQrOrder && (
                            <Button
                              size="small"
                              icon={
                                <SyncOutlined spin={isCheckingTransaction} className="size-3" />
                              }
                              onClick={() => void onCheckTransaction()}
                              color="cyan"
                              variant="outlined"
                              loading={isCheckingTransaction}
                              shape="square"
                            />
                          )}
                        </div>
                        {resolvedPaymentStatusId && (
                          <OrderStatusBadge status={resolvedPaymentStatusId} type="payment" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {(hasCancelTickets || isFetchingCancelTickets || isRefundOrder) && (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-500/20 dark:bg-rose-500/5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Thông tin hủy / hoàn tiền
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Chi tiết xử lý đơn hàng sau khi phát sinh hủy hoặc hoàn tiền
                    </p>
                  </div>
                </div>

                <div className="grid gap-x-6 md:grid-cols-2">
                  <div>
                    {renderInfoRow(
                      "Số lần hủy",
                      isFetchingCancelTickets
                        ? "Đang tải..."
                        : hasCancelTickets
                          ? cancelTickets.length
                          : "-",
                      {
                        borderClassName: "border-rose-100 dark:border-rose-500/10"
                      }
                    )}
                    {renderInfoRow(
                      "Số lượng vé hủy",
                      isFetchingCancelTickets
                        ? "Đang tải..."
                        : hasCancelTickets
                          ? totalCancelledTickets
                          : "-",
                      {
                        borderClassName: "border-rose-100 dark:border-rose-500/10"
                      }
                    )}
                  </div>
                  <div>
                    <div className="flex items-start justify-between gap-4 border-b border-rose-100 py-2 dark:border-rose-500/10">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        Trạng thái hoàn tiền
                      </span>
                      <div className="flex justify-end text-right [&_.ant-tag]:m-0">
                        {isRefundOrder ? (
                          <RefundStatusBadge status={currentOrder?.refundStatusId} />
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:border-slate-600/40 dark:bg-slate-700/30 dark:text-slate-200">
                            Chưa hoàn tiền
                          </span>
                        )}
                      </div>
                    </div>
                    {renderInfoRow(
                      "Số tiền đã hoàn",
                      formatMoney(currentOrder?.refundedAmount || 0),
                      {
                        borderClassName: "border-rose-100 dark:border-rose-500/10"
                      }
                    )}
                  </div>
                </div>

                <div className="pt-2 dark:border-rose-500/10">
                  <Table<CancellationTicketProps>
                    className={cn(
                      "mt-2 overflow-hidden rounded-xl border border-rose-100 bg-white shadow-sm dark:border-rose-500/10 dark:bg-white/3",
                      "[&_.ant-table]:bg-transparent [&_.ant-table]:text-slate-700 dark:[&_.ant-table]:text-slate-200",
                      "[&_.ant-table-container]:rounded-xl [&_.ant-table-container]:border-0",
                      "[&_.ant-table-thead>tr>th]:border-rose-100 [&_.ant-table-thead>tr>th]:bg-rose-100 [&_.ant-table-thead>tr>th]:text-xs [&_.ant-table-thead>tr>th]:font-semibold [&_.ant-table-thead>tr>th]:text-slate-600 dark:[&_.ant-table-thead>tr>th]:border-rose-500/10 dark:[&_.ant-table-thead>tr>th]:bg-rose-500/10 dark:[&_.ant-table-thead>tr>th]:text-slate-200",
                      "[&_.ant-table-tbody>tr>td]:border-rose-100 [&_.ant-table-tbody>tr>td]:text-sm dark:[&_.ant-table-tbody>tr>td]:border-rose-500/10",
                      "[&_.ant-table-tbody>tr:hover>td]:bg-rose-50/70 dark:[&_.ant-table-tbody>tr:hover>td]:bg-rose-500/10",
                      "[&_.ant-empty-description]:text-slate-500 dark:[&_.ant-empty-description]:text-slate-400"
                    )}
                    columns={cancelTicketColumns}
                    dataSource={cancelTickets}
                    rowKey="id"
                    size="small"
                    loading={isFetchingCancelTickets}
                    pagination={false}
                    scroll={{ x: 760 }}
                    locale={{ emptyText: "Không có phiếu hủy" }}
                  />
                </div>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-app-border dark:bg-app-bg-container dark:shadow-none">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Suất chiếu</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Thông tin phim, lịch chiếu và ghế ngồi
              </p>
            </div>

            <div className="grid gap-x-6 md:grid-cols-2">
              <div>
                {renderInfoRow("Tên phim", currentDetail?.film?.filmName)}
                {renderInfoRow(
                  "Giờ chiếu",
                  currentDetail?.planScreening?.projectTime
                    ? dayjs(currentDetail.planScreening.projectTime).format("HH:mm")
                    : "-"
                )}
                {renderInfoRow(
                  "Ngày chiếu",
                  currentDetail?.planScreening?.projectDate
                    ? dayjs(currentDetail.planScreening.projectDate).format("DD/MM/YYYY")
                    : "-"
                )}
              </div>
              <div>
                {renderInfoRow("Phòng chiếu", currentDetail?.room?.name)}

                {renderInfoRow("Số lượng vé", totalTickets)}
                {renderInfoRow("Vị trí ghế", renderMultilineEllipsisText(getChairs()))}
              </div>
            </div>
          </section>
        </div>

        {!currentOrder?.isInvitation && (
          <div className="grid gap-5 lg:grid-cols-[1.05fr,0.95fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-app-border dark:bg-app-bg-container dark:shadow-none">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Chương trình khuyến mãi
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Mỗi đơn chỉ áp dụng một loại ưu đãi tại thời điểm thanh toán
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    promotionMode === "campaign" &&
                      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
                    promotionMode === "ticket" &&
                      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
                    promotionMode === "none" &&
                      "bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300"
                  )}
                >
                  {promotionMode === "campaign"
                    ? "Khuyến mãi thành viên"
                    : promotionMode === "ticket"
                      ? "Ưu đãi theo vé"
                      : "Không áp dụng"}
                </div>
              </div>

              {promotionMode === "campaign" && (isU22Voucher || currentOrder?.campaign) ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  {renderInfoRow(
                    "Tên chương trình",
                    isU22Voucher
                      ? "Khuyến mãi giá vé dành cho thành viên U22"
                      : currentOrder?.campaign?.name,
                    {
                      borderClassName: "border-emerald-100 dark:border-emerald-500/20"
                    }
                  )}
                  {renderInfoRow("Mã áp dụng", currentOrder.voucherCode || "Không có mã", {
                    fallback: "Không có mã",
                    borderClassName: "border-emerald-100 dark:border-emerald-500/20"
                  })}
                  {renderInfoRow(
                    "Giá trị khuyến mãi",
                    formatMoney((currentOrder.orderDiscount || 0) - pricePointReward)
                  )}
                </div>
              ) : null}

              {promotionMode === "ticket" ? (
                <div className="space-y-3">
                  {ticketPromotions.map((promotion) => (
                    <div
                      key={promotion.id}
                      className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                            {promotion.name}
                          </p>
                          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                            {getPromotionValue(promotion.type, promotion.rate, promotion.amount)}{" "}
                            cho {promotion.quantity} vé
                          </p>
                        </div>
                        <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-amber-900 dark:bg-slate-900/70 dark:text-amber-200">
                          Giảm {formatMoney(promotion.totalDiscount)}
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-amber-900 dark:text-amber-200">
                        Ghế áp dụng: {promotion.seats.join(", ") || "-"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {promotionMode === "none" && !currentDetail?.order?.voucherCode ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-400">
                  Đơn hàng này không áp dụng chương trình khuyến mãi.
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-app-border dark:bg-app-bg-container dark:shadow-none">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Thanh toán
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Tóm tắt giá trị trước và sau ưu đãi
                </p>
              </div>

              <div className="space-y-1">
                {renderInfoRow(
                  "Tổng tiền gốc",
                  formatMoney((currentOrder?.orderTotal || 0) + (currentOrder?.orderDiscount || 0))
                )}
                {renderInfoRow(
                  "Khuyến mãi đã áp dụng",
                  `-${formatMoney((currentOrder?.orderDiscount || 0) - pricePointReward)}`,
                  {
                    valueClassName: "text-rose-600"
                  }
                )}
                {renderInfoRow("Điểm thưởng đã áp dụng", `-${formatMoney(pricePointReward)}`, {
                  valueClassName: "text-rose-600"
                })}
                {renderInfoRow("Khách cần thanh toán", formatMoney(currentOrder?.orderTotal || 0), {
                  valueClassName: "text-emerald-700 text-base font-semibold"
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default OrderDetailDialog;
