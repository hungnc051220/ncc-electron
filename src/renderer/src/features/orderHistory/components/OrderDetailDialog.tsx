import { ExportOutlined, SyncOutlined } from "@ant-design/icons";
import { cancelTicketsApi } from "@renderer/api/cancelTickets.api";
import { ordersApi } from "@renderer/api/orders.api";
import { OrderStatusBadge } from "@renderer/components/OrderStatusBadge";
import RefreshButton from "@renderer/components/RefreshButton";
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
  formatNumber,
  formatPaymentMethod,
  resolvePaymentType,
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
import { Button, Modal, Popover, Table, Tag, Typography } from "antd";
import type { PopoverProps, TableColumnsType } from "antd";
import dayjs from "dayjs";
import {
  Armchair,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Copy,
  CreditCard,
  Film,
  Gift,
  Info,
  Link2,
  Mail,
  Phone,
  ReceiptText,
  Send,
  Ticket,
  UserRound,
  UsersRound,
  WalletCards
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { usePermission } from "@renderer/permissions/usePermission";
import InvitationTicketPreview from "./InvitationTicketPreview";
import { getInvitationTicketIssuerName, refreshOrderDetailData } from "./OrderDetailDialog.utils";

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

type PromotionTableRow = {
  key: string;
  name: string;
  value: string;
  quantity: number;
  seats: string;
  totalDiscount: number;
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

const renderEllipsisPopover = (content: ReactNode, children: ReactNode) => {
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
  const normalizedValue = value?.trim() || "";
  const text = normalizedValue || "-";

  return (
    <div className="min-w-0 overflow-hidden">
      {renderEllipsisPopover(
        normalizedValue,
        <Typography.Text className="block! max-w-full!" ellipsis>
          {text}
        </Typography.Text>
      )}
    </div>
  );
};

const renderWrappedText = (value?: string | null) => (
  <span className="block min-w-0 wrap-break-word whitespace-normal">{value?.trim() || "-"}</span>
);

const renderRefundStateBadge = (status?: OrderResponseProps["refundStatusId"]) =>
  status ? (
    <RefundStatusBadge status={status} />
  ) : (
    <Tag
      color="error"
      className="mr-0 rounded-full border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
    >
      Chưa hoàn tiền
    </Tag>
  );

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
  const [isCancellingEInvoice, setIsCancellingEInvoice] = useState(false);
  const [isRefreshingOrderDetail, setIsRefreshingOrderDetail] = useState(false);
  const isCancellingEInvoiceRef = useRef(false);
  const isCancelEInvoiceConfirmOpenRef = useRef(false);
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
  const seatLabels = useMemo(() => extractSeatValues(currentItems), [currentItems]);
  const customerName = [currentOrder?.customerFirstName, currentOrder?.customerLastName]
    .map((name) => name?.trim())
    .filter(Boolean)
    .join(" ");
  const totalTickets = currentItems.reduce((sum, item) => sum + item.quantity, 0);
  const ticketPriceRows = useMemo(() => {
    const priceQuantityMap = currentItems.reduce<Map<number, number>>((map, item) => {
      const price = item.unitPriceInclTax || 0;
      const quantity = item.quantity || 0;

      if (quantity <= 0) {
        return map;
      }

      map.set(price, (map.get(price) || 0) + quantity);
      return map;
    }, new Map());

    return Array.from(priceQuantityMap.entries())
      .sort(([priceA], [priceB]) => priceB - priceA)
      .map(([price, quantity]) => ({ price, quantity }));
  }, [currentItems]);
  const ticketPriceDetails = ticketPriceRows
    .map(({ price, quantity }) => `Vé ${formatMoney(price)}: ${formatNumber(quantity)} vé`)
    .join(", ");
  const isRefundOrder = currentOrder?.refundStatusId != null;
  const isCancelOrder =
    currentOrder?.orderStatusId === OrderStatus.CANCELLED ||
    currentOrder?.orderStatusId === OrderStatus.FAIL;
  const { data: cancelTicketsResponse } = useQuery({
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
    !currentOrder.cancelTicket &&
    currentOrder.orderStatusId !== OrderStatus.COMPLETED &&
    !isInvitationOrder &&
    !currentOrder.isContract &&
    !isRefundOrder &&
    !isPastProjectDate;

  const canExport = can("invoices", "export");
  const canExportETicket =
    currentOrder?.orderStatusId === OrderStatus.COMPLETED && canExport && !currentOrder.eTicketUrl;
  const replacementInvoiceNo = currentOrder?.cancelTicket?.invNo?.trim() ?? "";
  const isEInvoiceCancelled = !!replacementInvoiceNo;
  const canCancelEInvoice =
    !!currentOrder?.invNo && !!currentOrder.cancelTicket && !isEInvoiceCancelled;

  const isVietQrOrder =
    resolvePaymentType(currentOrder?.paymentMethodSystemName) === PaymentType.VIETQR;
  const resolvedPaymentStatusId = resolveOrderPaymentStatus(currentOrder);

  const invitationTicket = currentOrder?.invitationTickets;
  const invitationTicketIssuerName = getInvitationTicketIssuerName(currentOrder);

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
          [canceller?.customerFirstName, canceller?.customerLastName]
            .map((name) => name?.trim())
            .filter(Boolean)
            .join(" ") || "-"
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

  const promotionTableData = useMemo<PromotionTableRow[]>(() => {
    if (promotionMode === "campaign" && (isU22Voucher || currentOrder?.campaign)) {
      return [
        {
          key: `campaign-${currentOrder?.campaign?.id ?? "u22"}`,
          name: isU22Voucher
            ? "Khuyến mãi giá vé dành cho thành viên U22"
            : currentOrder?.campaign?.name || "Khuyến mãi thành viên",
          value: currentOrder?.voucherCode || "Ưu đãi thành viên",
          quantity: totalTickets,
          seats: seatLabels.join(", "),
          totalDiscount: (currentOrder?.orderDiscount || 0) - pricePointReward
        }
      ];
    }

    if (promotionMode === "ticket") {
      return ticketPromotions.map((promotion) => ({
        key: `ticket-${promotion.id}`,
        name: promotion.name,
        value: getPromotionValue(promotion.type, promotion.rate, promotion.amount),
        quantity: promotion.quantity,
        seats: promotion.seats.join(", "),
        totalDiscount: promotion.totalDiscount
      }));
    }

    return [];
  }, [
    currentOrder?.campaign,
    currentOrder?.orderDiscount,
    currentOrder?.voucherCode,
    isU22Voucher,
    pricePointReward,
    promotionMode,
    seatLabels,
    ticketPromotions,
    totalTickets
  ]);

  const promotionTableColumns = useMemo<TableColumnsType<PromotionTableRow>>(
    () => [
      {
        title: "Chương trình",
        dataIndex: "name",
        key: "name",
        width: 190,
        render: (value: string) => renderEllipsisText(value)
      },
      {
        title: "Ưu đãi",
        dataIndex: "value",
        key: "value",
        width: 110,
        align: "right",
        render: (value: string) => renderEllipsisText(value)
      },
      {
        title: "Số vé",
        dataIndex: "quantity",
        key: "quantity",
        width: 70,
        align: "right"
      },
      {
        title: "Ghế áp dụng",
        dataIndex: "seats",
        key: "seats",
        width: 110,
        ellipsis: { showTitle: false },
        render: (value: string) => renderEllipsisText(value)
      },
      {
        title: "Tổng giảm",
        dataIndex: "totalDiscount",
        key: "totalDiscount",
        width: 110,
        align: "right",
        render: (value: number) => (
          <span className="font-medium text-rose-600 dark:text-rose-300">
            -{formatMoney(value || 0)}
          </span>
        )
      }
    ],
    []
  );

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
          "mr-0 rounded-full border px-2 py-0.5 text-xs font-semibold",
          config?.className
        )}
      >
        {config?.label ?? status ?? "-"}
      </Tag>
    );
  };

  const fieldIconMap: Record<string, ReactNode> = {
    "Email nhận vé": <Mail />,
    "Thời gian xuất vé": <Clock3 />,
    "Trạng thái gửi": <Send />,
    "Người xuất vé": <UserRound />,
    "Tên khách hàng": <UserRound />,
    "Số điện thoại": <Phone />,
    Email: <Mail />,
    "Thời gian mua": <Clock3 />,
    "Kênh thanh toán": <CreditCard />,
    "Mã vé điện tử": <ReceiptText />,
    "Đường dẫn vé điện tử": <Link2 />,
    "Trạng thái gửi vé": <Send />,
    "Tên phim": <Film />,
    "Ngày chiếu": <CalendarDays />,
    "Giờ chiếu": <Clock3 />,
    "Phòng chiếu": <Film />,
    "Số lượng vé": <UsersRound />,
    "Chi tiết giá vé": <Ticket />,
    "Vị trí ghế": <Armchair />,
    "Tổng tiền gốc": <CircleDollarSign />,
    "Khuyến mãi đã áp dụng": <Gift />,
    "Điểm thưởng đã áp dụng": <CircleDollarSign />,
    "Khách cần thanh toán": <WalletCards />,
    "Thời gian hủy": <Clock3 />,
    "Người hủy": <UserRound />,
    "Ghế hủy": <Armchair />,
    "Lý do": <ReceiptText />,
    "Trạng thái hoàn tiền": <WalletCards />,
    "Số tiền đã hoàn": <CircleDollarSign />
  };

  const resolveInfoValue = (value?: ReactNode, fallback: ReactNode = "-") =>
    typeof value === "string" ? (value.trim() ? value : fallback) : (value ?? fallback);

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
          ? "grid grid-cols-1 items-start gap-1 border-b border-slate-100 py-1.5 last:border-b-0 md:grid-cols-[112px_minmax(0,1fr)] md:gap-3 dark:border-app-border"
          : "grid grid-cols-[88px_minmax(0,1fr)] items-start gap-3 border-b border-slate-100 py-1.5 last:border-b-0 dark:border-app-border",
        options?.borderClassName
      )}
    >
      <span className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
        <span className="[&>svg]:size-4 text-primary">{fieldIconMap[label] ?? <Info />}</span>
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 wrap-break-word text-right text-sm font-medium text-slate-900 dark:text-slate-100",
          options?.valueClassName
        )}
      >
        {resolveInfoValue(value, options?.fallback)}
      </span>
    </div>
  );

  const renderInfoItem = (label: string, value?: ReactNode, className?: string) => (
    <div className={cn("min-w-0 bg-white px-3.5 py-3 dark:bg-app-bg-container", className)}>
      <p className="mb-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="[&>svg]:size-4 text-primary">{fieldIconMap[label] ?? <Info />}</span>
        {label}
      </p>
      <div className="min-w-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {resolveInfoValue(value)}
      </div>
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
    return refreshOrderDetailData({
      orderId: currentOrderId,
      refetch: refetchOrderDetail,
      invalidateOrders: () => queryClient.invalidateQueries({ queryKey: ordersKeys.all })
    });
  };

  const onRefreshOrderDetail = async () => {
    try {
      setIsRefreshingOrderDetail(true);
      await refreshOrderDetail();
      message.success("Đã cập nhật thông tin đơn hàng");
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Làm mới thông tin đơn hàng thất bại"));
    } finally {
      setIsRefreshingOrderDetail(false);
    }
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
          <strong>{currentOrder.barCode?.trim() || "-"}</strong> sang thành công không? Thao tác
          không thể thu hồi.
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

  const onCancelEInvoice = () => {
    const cancelTicketId = currentOrder?.cancelTicket?.id;

    if (
      !cancelTicketId ||
      isEInvoiceCancelled ||
      isCancellingEInvoiceRef.current ||
      isCancelEInvoiceConfirmOpenRef.current
    ) {
      return;
    }

    isCancelEInvoiceConfirmOpenRef.current = true;

    modal.confirm({
      title: "Xác nhận hủy hóa đơn điện tử",
      content: "Bạn có chắc chắn muốn hủy hóa đơn điện tử của đơn hàng này không?",
      okText: "Hủy HĐĐT",
      cancelText: "Đóng",
      okButtonProps: { danger: true },
      afterClose: () => {
        isCancelEInvoiceConfirmOpenRef.current = false;
      },
      onOk: async () => {
        if (isCancellingEInvoiceRef.current) return Promise.reject();

        isCancellingEInvoiceRef.current = true;
        setIsCancellingEInvoice(true);

        try {
          await cancelTicketsApi.cancelEInvoice(cancelTicketId);
          await Promise.all([
            refetchOrderDetail(),
            queryClient.invalidateQueries({ queryKey: ["cancel-tickets"] })
          ]);
          message.success("Hủy hóa đơn điện tử thành công");
        } catch (error: unknown) {
          message.error(getApiErrorMessage(error, "Hủy hóa đơn điện tử thất bại"));
          throw error;
        } finally {
          isCancellingEInvoiceRef.current = false;
          setIsCancellingEInvoice(false);
        }
      }
    });
  };

  const copyText = async (value: string, successMessage: string, errorMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      message.success(successMessage);
    } catch {
      message.error(errorMessage);
    }
  };

  const renderCopyButton = (
    value: string,
    label: string,
    successMessage: string,
    errorMessage: string
  ) => (
    <Button
      type="text"
      size="small"
      icon={<Copy className="size-3.5" aria-hidden />}
      aria-label={label}
      title={label}
      className="shrink-0 text-slate-500! hover:text-primary! dark:text-slate-400!"
      onClick={(event) => {
        event.stopPropagation();
        void copyText(value, successMessage, errorMessage);
      }}
    />
  );

  const renderCopyInvoiceButton = (invoiceNo: string, label: string) =>
    renderCopyButton(invoiceNo, label, `Đã sao chép mã ${invoiceNo}`, "Không thể sao chép mã HĐĐT");

  return (
    <Modal
      title="Thông tin bán vé"
      open={open}
      destroyOnHidden
      onCancel={() => onOpenChange(false)}
      width={
        isInvitationOrder ? "min(1180px, calc(100vw - 24px))" : "min(1400px, calc(100vw - 24px))"
      }
      centered
      classNames={{
        wrapper: "py-4",
        container: "overflow-hidden p-0!",
        header:
          "mb-0! border-b border-slate-200 px-4 py-3 dark:border-app-border dark:bg-app-bg-container",
        body: "max-h-[calc(100vh-144px)] overflow-y-auto p-4! dark:bg-app-bg-container",
        footer:
          "mt-0! border-t border-slate-200 px-4 py-2.5 dark:border-app-border dark:bg-app-bg-container"
      }}
      cancelText="Đóng"
      footer={(_, { CancelBtn }) => (
        <>
          <CancelBtn />
          {canCancelEInvoice && (
            <Button
              danger
              onClick={onCancelEInvoice}
              loading={isCancellingEInvoice}
              disabled={isCancellingEInvoice}
            >
              Hủy HĐĐT
            </Button>
          )}
          {canExportETicket && (
            <Button
              variant="solid"
              color="blue"
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
      <div className="space-y-3 text-slate-900 dark:text-slate-100">
        <div
          className={cn(
            "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-bg-container dark:shadow-none",
            isInvitationOrder ? "px-3 py-2.5" : "px-4 py-3"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid min-w-0 flex-1 grid-cols-2 items-start gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="min-w-0 px-1">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  Mã đơn hàng
                </p>
                <div className="flex h-6 items-center gap-2">
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-300">
                    {currentOrder?.id ?? "-"}
                  </span>
                  {currentOrder?.id != null &&
                    renderCopyButton(
                      String(currentOrder.id),
                      "Sao chép mã đơn hàng",
                      `Đã sao chép mã đơn hàng ${currentOrder.id}`,
                      "Không thể sao chép mã đơn hàng"
                    )}
                  {orderTypeBadge && (
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        orderTypeBadge.className
                      )}
                    >
                      {orderTypeBadge.label}
                    </span>
                  )}
                </div>
              </div>
              <div className="min-w-0 px-1">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  Mã đặt vé
                </p>
                <p className="flex h-6 min-w-0 items-center">
                  <span className="block max-w-full truncate text-sm font-bold text-primary">
                    {currentOrder?.barCode?.trim() || "-"}
                  </span>
                </p>
              </div>
              <div className="min-w-0 px-1">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  Máy bán
                </p>
                <p className="flex h-6 min-w-0 items-center truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                  {currentOrder?.items[0]?.posName || currentOrder?.posName || "-"}
                </p>
              </div>
              <div className="min-w-0 px-1">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  Trạng thái đơn
                </p>
                <div className="flex h-6 items-center">
                  {currentOrder?.orderStatusId ? (
                    <OrderStatusBadge status={currentOrder.orderStatusId} type="order" />
                  ) : (
                    "-"
                  )}
                </div>
              </div>
              <div className="min-w-0 px-1">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  Trạng thái thanh toán
                </p>
                <div className="flex h-6 items-center gap-1.5">
                  {resolvedPaymentStatusId ? (
                    <OrderStatusBadge status={resolvedPaymentStatusId} type="payment" />
                  ) : (
                    "-"
                  )}
                  {isVietQrOrder && (
                    <Button
                      size="small"
                      icon={<SyncOutlined spin={isCheckingTransaction} className="size-3" />}
                      onClick={() => void onCheckTransaction()}
                      color="cyan"
                      variant="outlined"
                      loading={isCheckingTransaction}
                      shape="square"
                    />
                  )}
                </div>
              </div>
            </div>

            {currentOrder && (
              <RefreshButton
                color="primary"
                variant="filled"
                label="Làm mới"
                aria-label="Làm mới thông tin đơn hàng"
                className="shrink-0"
                onRefresh={onRefreshOrderDetail}
                loading={isRefreshingOrderDetail || isFetchingOrderDetail}
                disabled={
                  isChangingToSuccess ||
                  isCheckingTransaction ||
                  isExportingETicket ||
                  isCancellingEInvoice
                }
              />
            )}
          </div>
        </div>

        <div className="grid items-stretch gap-3 lg:grid-cols-12">
          <section
            className={cn(
              "rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-app-border dark:bg-app-bg-container dark:shadow-none",
              isInvitationOrder ? "flex h-full flex-col lg:col-span-4" : "lg:col-span-6"
            )}
          >
            {isInvitationOrder ? (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      Thông tin giấy mời
                    </h3>
                  </div>
                </div>

                {invitationTicket ? (
                  <div className="grid flex-1 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:auto-rows-fr dark:border-app-border dark:bg-app-border">
                    {renderInfoItem(
                      "Email nhận vé",
                      renderWrappedText(invitationTicket.receivedEmail),
                      "sm:col-span-2"
                    )}
                    {renderInfoItem(
                      "Thời gian xuất vé",
                      invitationTicket.createdAt && dayjs(invitationTicket.createdAt).isValid()
                        ? dayjs(invitationTicket.createdAt).format("HH:mm DD/MM/YYYY")
                        : "-"
                    )}
                    {renderInfoItem("Người xuất vé", renderWrappedText(invitationTicketIssuerName))}
                    {renderInfoItem(
                      "Trạng thái gửi",
                      renderInvitationTicketStatus(invitationTicket.status),
                      "sm:col-span-2"
                    )}
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 px-4 py-4 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
                    Chưa có thông tin xuất giấy mời.
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      Khách hàng và thông tin vé
                    </h3>
                  </div>
                </div>

                <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-3 dark:border-app-border dark:bg-app-border">
                  {renderInfoItem("Tên khách hàng", customerName || "-")}
                  {renderInfoItem("Số điện thoại", currentOrder?.customerPhone || "-")}
                  {renderInfoItem("Email", renderEllipsisText(currentOrder?.customerEmail))}
                  {renderInfoItem(
                    "Thời gian mua",
                    currentOrder?.createdOnUtc
                      ? dayjs(currentOrder.createdOnUtc).format("HH:mm DD/MM/YYYY")
                      : "-"
                  )}
                  {renderInfoItem(
                    "Kênh thanh toán",
                    formatPaymentMethod(currentOrder?.paymentMethodSystemName)
                  )}
                  {renderInfoItem(
                    "Mã vé điện tử",
                    currentOrder?.invNo && isEInvoiceCancelled
                      ? renderEllipsisPopover(
                          <div className="min-w-72 space-y-2">
                            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 dark:border-app-border">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-primary">Mã HĐĐT gốc</p>
                                <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-slate-100">
                                  <span>{currentOrder.invNo}</span>
                                  {renderCopyInvoiceButton(
                                    currentOrder.invNo,
                                    "Sao chép mã HĐĐT gốc"
                                  )}
                                </div>
                              </div>
                              <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                                Đã hủy
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-primary">Mã HĐĐT thay thế</p>
                                <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-slate-100">
                                  <span>{replacementInvoiceNo}</span>
                                  {renderCopyInvoiceButton(
                                    replacementInvoiceNo,
                                    "Sao chép mã HĐĐT thay thế"
                                  )}
                                </div>
                              </div>
                              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                Thay thế
                              </span>
                            </div>
                          </div>,
                          <span className="inline-flex items-center gap-2">
                            <span>{currentOrder.invNo}</span>
                            {renderCopyInvoiceButton(currentOrder.invNo, "Sao chép mã HĐĐT gốc")}
                            <Tag color="error" className="mr-0 rounded-full text-[11px]">
                              Đã hủy
                            </Tag>
                          </span>
                        )
                      : currentOrder?.invNo
                  )}
                  {renderInfoItem(
                    "Đường dẫn vé điện tử",
                    currentOrder?.eTicketUrl
                      ? renderEllipsisPopover(
                          currentOrder.eTicketUrl,
                          <a
                            href={currentOrder.eTicketUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block max-w-full truncate text-primary underline underline-offset-2 hover:opacity-80"
                          >
                            {currentOrder.eTicketUrl}
                          </a>
                        )
                      : undefined,
                    "sm:col-span-2"
                  )}
                  {renderInfoItem(
                    "Trạng thái gửi vé",
                    <div className="flex flex-nowrap gap-1">
                      <Tag
                        color={currentOrder?.isEmailSent ? "success" : "default"}
                        className="mr-0 whitespace-nowrap text-[11px]"
                      >
                        {currentOrder?.isEmailSent ? "Đã gửi email" : "Chưa gửi email"}
                      </Tag>
                      <Tag
                        color={currentOrder?.isSmsSent ? "success" : "default"}
                        className="mr-0 whitespace-nowrap text-[11px]"
                      >
                        {currentOrder?.isSmsSent ? "Đã gửi SMS" : "Chưa gửi SMS"}
                      </Tag>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <section
            className={cn(
              "rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-app-border dark:bg-app-bg-container dark:shadow-none",
              isInvitationOrder ? "flex h-full flex-col lg:col-span-8" : "lg:col-span-6"
            )}
          >
            <div className="mb-2">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Suất chiếu</h3>
            </div>

            <div
              className={cn(
                "grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 dark:border-app-border dark:bg-app-border",
                isInvitationOrder ? "flex-1 lg:auto-rows-fr lg:grid-cols-3" : "xl:grid-cols-3"
              )}
            >
              {renderInfoItem(
                "Tên phim",
                isInvitationOrder
                  ? renderWrappedText(currentDetail?.film?.filmName)
                  : renderEllipsisText(currentDetail?.film?.filmName),
                isInvitationOrder ? "sm:col-span-2 lg:col-span-3" : "sm:col-span-2 xl:col-span-3"
              )}
              {renderInfoItem(
                "Ngày chiếu",
                currentDetail?.planScreening?.projectDate
                  ? dayjs(currentDetail.planScreening.projectDate).format("DD/MM/YYYY")
                  : "-"
              )}
              {renderInfoItem(
                "Giờ chiếu",
                currentDetail?.planScreening?.projectTime
                  ? dayjs(currentDetail.planScreening.projectTime).format("HH:mm")
                  : "-"
              )}
              {renderInfoItem("Phòng chiếu", currentDetail?.room?.name)}
              {renderInfoItem("Số lượng vé", totalTickets)}
              {renderInfoItem(
                "Chi tiết giá vé",
                isInvitationOrder
                  ? renderWrappedText(ticketPriceDetails)
                  : renderEllipsisPopover(
                      <div className="min-w-64 space-y-2">
                        {ticketPriceRows.map(({ price, quantity }, index) => (
                          <div
                            key={price}
                            className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0 dark:border-app-border"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-primary">
                                Mức giá {index + 1}
                              </p>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {formatMoney(price)}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                              {formatNumber(quantity)} vé
                            </span>
                          </div>
                        ))}
                      </div>,
                      <Typography.Text className="block! max-w-full!" ellipsis>
                        {ticketPriceDetails || "-"}
                      </Typography.Text>
                    )
              )}
              {renderInfoItem(
                "Vị trí ghế",
                isInvitationOrder
                  ? renderWrappedText(seatLabels.join(", "))
                  : renderEllipsisText(seatLabels.join(", "))
              )}
            </div>
          </section>
        </div>

        {isInvitationOrder && (
          <InvitationTicketPreview
            active={open}
            imageUrl={invitationTicket?.urlTicket}
            ticketCode={currentOrder?.barCode}
          />
        )}

        {!currentOrder?.isInvitation && (
          <div className="grid items-stretch gap-3 lg:grid-cols-12">
            <section className="order-1 flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:col-span-7 dark:border-app-border dark:bg-app-bg-container dark:shadow-none">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Chương trình khuyến mãi
                  </h3>
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

              {promotionTableData.length > 0 ? (
                <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 dark:border-app-border">
                  <Table<PromotionTableRow>
                    className={cn(
                      "[&_.ant-table]:bg-transparent",
                      "[&_.ant-table-thead>tr>th]:px-2.5 [&_.ant-table-thead>tr>th]:py-2 [&_.ant-table-thead>tr>th]:text-xs",
                      "[&_.ant-table-tbody>tr>td]:px-2.5 [&_.ant-table-tbody>tr>td]:py-2 [&_.ant-table-tbody>tr>td]:text-sm"
                    )}
                    columns={promotionTableColumns}
                    dataSource={promotionTableData}
                    rowKey="key"
                    size="small"
                    tableLayout="fixed"
                    pagination={false}
                  />
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-400">
                  <Gift className="size-5 text-slate-400 dark:text-slate-500" aria-hidden />
                  <span>Đơn hàng này không áp dụng chương trình khuyến mãi.</span>
                </div>
              )}
            </section>

            <section className="order-2 h-full self-stretch rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:col-span-5 dark:border-app-border dark:bg-app-bg-container dark:shadow-none">
              <div className="mb-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Thanh toán
                </h3>
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

        {hasCancelTickets && (
          <section className="h-fit self-start rounded-xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-500/20 dark:bg-rose-500/5">
            <div className="mb-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Thông tin hủy / hoàn tiền
              </h4>
            </div>

            {cancelTickets.length === 1 ? (
              <div className="grid gap-px overflow-hidden rounded-lg border border-rose-200 bg-rose-200 sm:grid-cols-2 lg:grid-cols-4 dark:border-rose-500/20 dark:bg-rose-500/20">
                {renderInfoItem(
                  "Thời gian hủy",
                  cancelTickets[0].createdOnUtc
                    ? dayjs(cancelTickets[0].createdOnUtc).format("HH:mm DD/MM/YYYY")
                    : "-"
                )}
                {renderInfoItem(
                  "Người hủy",
                  [
                    cancelTickets[0].canceller?.customerFirstName,
                    cancelTickets[0].canceller?.customerLastName
                  ]
                    .map((name) => name?.trim())
                    .filter(Boolean)
                    .join(" ") || "-"
                )}
                {renderInfoItem("Số lượng vé", cancelTickets[0].quantity || 0)}
                {renderInfoItem(
                  "Ghế hủy",
                  renderEllipsisText(getCancelTicketChairs(cancelTickets[0]))
                )}
                {renderInfoItem(
                  "Lý do",
                  renderEllipsisText(cancelTickets[0].reason),
                  "sm:col-span-2"
                )}
                {renderInfoItem(
                  "Trạng thái hoàn tiền",
                  renderRefundStateBadge(currentOrder?.refundStatusId)
                )}
                {renderInfoItem("Số tiền đã hoàn", formatMoney(currentOrder?.refundedAmount || 0))}
              </div>
            ) : (
              <div className="overflow-auto dark:border-rose-500/10">
                <Table<CancellationTicketProps>
                  className={cn(
                    "overflow-hidden rounded-xl border border-rose-100 bg-white shadow-sm dark:border-rose-500/10 dark:bg-white/3",
                    "[&_.ant-table]:bg-transparent [&_.ant-table]:text-slate-700 dark:[&_.ant-table]:text-slate-200",
                    "[&_.ant-table-container]:rounded-xl [&_.ant-table-container]:border-0",
                    "[&_.ant-table-thead>tr>th]:border-rose-100 [&_.ant-table-thead>tr>th]:bg-rose-100 [&_.ant-table-thead>tr>th]:text-xs [&_.ant-table-thead>tr>th]:font-semibold [&_.ant-table-thead>tr>th]:text-slate-600 dark:[&_.ant-table-thead>tr>th]:border-rose-500/10 dark:[&_.ant-table-thead>tr>th]:bg-rose-500/10 dark:[&_.ant-table-thead>tr>th]:text-slate-200",
                    "[&_.ant-table-tbody>tr>td]:border-rose-100 [&_.ant-table-tbody>tr>td]:text-sm dark:[&_.ant-table-tbody>tr>td]:border-rose-500/10",
                    "[&_.ant-table-tbody>tr:hover>td]:bg-rose-50/70 dark:[&_.ant-table-tbody>tr:hover>td]:bg-rose-500/10"
                  )}
                  columns={cancelTicketColumns}
                  dataSource={cancelTickets}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  scroll={{ x: 760, ...(cancelTickets.length > 4 ? { y: 144 } : {}) }}
                />
              </div>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
};

export default OrderDetailDialog;
