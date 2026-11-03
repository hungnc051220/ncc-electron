import { CancelOrderDto, OrderDto, OrderQuoteDto, ordersApi } from "@renderer/api/orders.api";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import ticketIcon from "@renderer/assets/icons/confirmation_number.svg";
import { useDiscounts } from "@renderer/hooks/discounts/useDiscounts";
import { useCancelOrder } from "@renderer/hooks/orders/useCancelOrder";
import { useCreateOrder } from "@renderer/hooks/orders/useCreateOrder";
import { useCreateQrOrder } from "@renderer/hooks/orders/useCreateQrOrder";
import { useOrdersByScreening } from "@renderer/hooks/orders/useOrdersByScreening";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import {
  buildTicketsFromOrder,
  cn,
  formatMoney,
  isPlanScreeningLocked,
  resolveOrderPaymentStatus
} from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { usePrinterStore } from "@renderer/store/printer.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import {
  DiscountProps,
  ListSeat,
  PaymentStatus,
  OrderResponseProps,
  PaymentType,
  PlanScreeningDetailProps,
  QrDialogData,
  OrderStatus
} from "@shared/types";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { DescriptionsProps, GetProp } from "antd";
import { Badge, Button, Checkbox, Descriptions, Form, Modal, Select, Tooltip } from "antd";
import { cancellationReasonsApi } from "@renderer/api/cancellationReasons.api";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { getPrintErrorMessage } from "@renderer/lib/print";
import { onOrderPaymentUpdated } from "@renderer/socket/socket";
import { useAuthStore } from "@renderer/store/auth.store";
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import DiscountPopup from "./DiscountPopup";
import InvoiceDialog from "../../invoices/components/InvoiceDialog";
import QrCodeDialog from "./QrCodeDialog";
import VipCardDialog from "./VipCardDialog";
import { useUpdateOrder } from "@renderer/hooks/orders/useUpdateOrder";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { CancelOrderSelection, formatCancelSeatList } from "./cancelOrderSelection";
import type { PaperVoucherSelectionLine } from "@renderer/features/vouchers/paperVouchers/paperVoucherRedemption";
import { usePaperVoucherOrderQuote } from "@renderer/hooks/orders/usePaperVoucherOrderQuote";
import { TicketPercent } from "lucide-react";
import PaperVoucherDialog from "./PaperVoucherDialog";
import PaperVoucherSummary from "./PaperVoucherSummary";
import {
  classifyPaperVoucherOrderError,
  createPaperVoucherRequestId,
  isPaperVoucherSaleEnabled,
  PAPER_VOUCHER_BLOCKS_SALE_MESSAGE,
  PAPER_VOUCHER_CASH_ONLY_MESSAGE,
  PAPER_VOUCHER_PAYMENT_METHOD,
  PAPER_VOUCHER_QUOTE_CHANGED_MESSAGE,
  PAPER_VOUCHER_QUOTE_PENDING_MESSAGE,
  PAPER_VOUCHER_RESERVE_BLOCKED_MESSAGE
} from "./paperVoucherSale";

/** Thông tin thẻ thành viên/khuyến mãi chọn trong `VipCardDialog`. */
type BookingParams = {
  customerId?: number;
  memberCardCode?: string;
  voucherCode?: string;
  pointCard?: number;
  pointReward?: number;
};

export const paymentTypes = [
  {
    value: PaymentType.VIETQR,
    label: "Quét VietQR"
  },
  {
    value: PaymentType.VNPAY,
    label: "Quét VNPayQR"
  }
];

type FieldType = {
  cancelReasonId: number;
  isRefund: boolean;
};

export const getSeatDiscountKey = (seat: ListSeat) => `${seat.floor}-${seat.seat}`;

export const buildSeatFieldsByFloor = (selectedSeats: ListSeat[]) => {
  const floors = [1, 2, 3] as const;

  return floors.reduce<
    Pick<
      OrderDto,
      | "listChairIndexF1"
      | "listChairValueF1"
      | "listChairIndexF2"
      | "listChairValueF2"
      | "listChairIndexF3"
      | "listChairValueF3"
    >
  >((acc, floor) => {
    const seatsByFloor = selectedSeats.filter((seat) => seat.floor === floor);

    if (seatsByFloor.length === 0) {
      return acc;
    }

    const indexKey = `listChairIndexF${floor}` as
      | "listChairIndexF1"
      | "listChairIndexF2"
      | "listChairIndexF3";
    const valueKey = `listChairValueF${floor}` as
      | "listChairValueF1"
      | "listChairValueF2"
      | "listChairValueF3";

    acc[indexKey] = seatsByFloor.map((seat) => seat.seat).join(",");
    acc[valueKey] = seatsByFloor.map((seat) => seat.code).join(",");

    return acc;
  }, {});
};

export const calculateSeatDiscount = (seat: ListSeat, discount?: DiscountProps) => {
  if (!discount) return 0;

  const maxDiscount = seat.price || 0;

  if (discount.discountRate) {
    return Math.min((seat.price * discount.discountRate) / 100, maxDiscount);
  }

  return Math.min(discount.discountAmount || 0, maxDiscount);
};

interface ActionsProps {
  data: PlanScreeningDetailProps;
  planScreenId: number;
  selectedSeats: ListSeat[];
  setSelectedSeats: Dispatch<SetStateAction<ListSeat[]>>;
  cancelMode: boolean;
  setCancelMode: Dispatch<SetStateAction<boolean>>;
  cancelOrderSelection?: CancelOrderSelection | null;
  onCancelOrderSelectionClear?: () => void;
  isSeatSelectionPending?: boolean;
  verifySelectedSeats?: () => Promise<boolean>;
}

const Actions = ({
  data,
  planScreenId,
  selectedSeats,
  setSelectedSeats,
  cancelMode,
  setCancelMode,
  cancelOrderSelection,
  onCancelOrderSelectionClear = () => undefined,
  isSeatSelectionPending = false,
  verifySelectedSeats
}: ActionsProps) => {
  const { message } = useAntdApp();

  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const { posName, posShortName } = useSettingPosStore();
  const selectedPrinter = usePrinterStore((s) => s.selectedPrinter);
  const isCustomerView = searchParams.get("view") === "customer";
  const queryClient = useQueryClient();
  const [vipCard, setVipCard] = useState(false);
  const [openDiscount, setOpenDiscount] = useState(false);
  const [selectedDiscountGroups, setSelectedDiscountGroups] = useState<
    Record<string, number | undefined>
  >({});
  const [paymentMethod, setPaymentMethod] = useState<string[]>([]);
  const [openQrDialog, setOpenQrDialog] = useState(false);
  const [openVipCardDialog, setOpenVipCardDialog] = useState(false);
  const [exportInvoice, setExportInvoice] = useState(false);
  const [openInvoiceDialog, setOpenInvoiceDialog] = useState(false);
  const [invoiceOrderId, setInvoiceOrderId] = useState<number | undefined>(undefined);
  const [qrData, setQrData] = useState<QrDialogData | undefined>(undefined);
  const qrDataRef = useRef<QrDialogData | undefined>(undefined);
  const [openCancelSeats, setOpenCancelSeats] = useState(false);
  const cancelSeatList = useMemo(
    () => formatCancelSeatList(cancelOrderSelection?.seats || []),
    [cancelOrderSelection?.seats]
  );
  const hasValidCancelSelection = cancelOrderSelection
    ? cancelOrderSelection.isComplete
    : selectedSeats.length > 0;

  useEffect(() => {
    if (!cancelOrderSelection) {
      setOpenCancelSeats(false);
      form.resetFields();
    }
  }, [cancelOrderSelection, form]);
  const [lastSaleTotal, setLastSaleTotal] = useState(
    () => Number(sessionStorage.getItem("lastTotal")) || 0
  );
  const [isCheckingQrTransaction, setIsCheckingQrTransaction] = useState(false);
  // Tắt cờ bán vé có voucher giấy: chỉ lưu lựa chọn tại màn hình và chặn in vé.
  const [paperVoucherLines, setPaperVoucherLines] = useState<PaperVoucherSelectionLine[]>([]);
  const [openPaperVoucherDialog, setOpenPaperVoucherDialog] = useState(false);
  const hasPaperVoucher = paperVoucherLines.length > 0;
  const paperVoucherSaleEnabled = isPaperVoucherSaleEnabled();
  const isPaperVoucherSale = paperVoucherSaleEnabled && hasPaperVoucher;
  // Thẻ thành viên đã quẹt cho đơn có voucher giấy: phải có trong báo giá trước khi thu tiền.
  const [vipSelection, setVipSelection] = useState<BookingParams | null>(null);
  // Khóa idempotency của một lần bán: giữ khi lỗi mạng/5xx, tạo mới khi lựa chọn đổi/sau khi xong.
  const paperVoucherRequestIdRef = useRef<string | null>(null);

  const userId = useAuthStore((s) => s.userId);
  const { data: user } = useUserDetail(userId!);
  const { can } = usePermission();
  const canCreate = can("showtimes", "create");
  const canUpdate = can("showtimes", "update");
  const canPrint = can("showtimes", "print");
  const { data: discounts } = useDiscounts({ current: 1, pageSize: 20, onlyApplicable: true });
  const discountsById = useMemo(
    () => new Map((discounts?.data || []).map((discount) => [discount.id, discount])),
    [discounts]
  );

  const {
    data: cancellationReasons,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["cancellation-reasons"],
    queryFn: ({ pageParam = 1 }) =>
      cancellationReasonsApi.getAll({ current: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  const options = useMemo(() => {
    return (
      cancellationReasons?.pages.flatMap((page) =>
        page.data.map((item) => ({
          value: item.id,
          label: item.reason
        }))
      ) ?? []
    );
  }, [cancellationReasons]);

  const createOrder = useCreateOrder();
  const createQr = useCreateQrOrder();
  const cancelOrder = useCancelOrder();
  const updateOrder = useUpdateOrder();
  const { data: screeningOrders } = useOrdersByScreening(planScreenId);
  const isPlanScreeningPast = isPlanScreeningLocked(data.projectDate, data.projectTime);
  const [isCancelReservePending, setIsCancelReservePending] = useState(false);

  const syncLastSaleTotal = useCallback((total: number) => {
    sessionStorage.setItem("lastTotal", total.toString());
    setLastSaleTotal(total);
  }, []);

  const handlePrint = useCallback(
    async (orderId: number) => {
      const printMessageKey = `plan-screening-print-${orderId}`;

      try {
        message.open({
          type: "loading",
          key: printMessageKey,
          content: "Đang in vé...",
          duration: 0
        });

        const orderDetail = await queryClient.fetchQuery({
          queryKey: ordersKeys.getDetail(orderId),
          queryFn: () => ordersApi.getDetail(orderId)
        });

        const tickets = await buildTicketsFromOrder(orderDetail, user?.fullname, posName);

        await window.api?.printTickets(tickets, selectedPrinter);
      } catch (error) {
        console.error(error);
        message.error({
          key: printMessageKey,
          content: getPrintErrorMessage(error),
          duration: 4,
          pauseOnHover: false
        });
        return;
      }

      try {
        await ordersApi.markPrinted({
          orderId,
          posShortName
        });

        message.open({
          type: "success",
          key: printMessageKey,
          content: "In vé thành công",
          duration: 2,
          pauseOnHover: false
        });

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: planScreeningsKeys.getDetail(planScreenId)
          }),
          queryClient.invalidateQueries({
            queryKey: ordersKeys.getOrdersByScreening(planScreenId)
          }),
          queryClient.invalidateQueries({
            queryKey: ordersKeys.getDetail(orderId)
          })
        ]);
      } catch (error) {
        console.error(error);
        message.error({
          key: printMessageKey,
          content: getApiErrorMessage(error, "Cập nhật trạng thái in vé thất bại"),
          duration: 4,
          pauseOnHover: false
        });
      }
    },
    [message, planScreenId, queryClient, selectedPrinter, user, posName, posShortName]
  );

  const handleQrPaymentSuccess = useCallback(
    async (orderId: number, orderTotal: number) => {
      syncLastSaleTotal(orderTotal);
      message.success("Thanh toán thành công! Đang cập nhật dữ liệu...");
      if (canPrint) {
        void handlePrint(orderId);
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: planScreeningsKeys.getDetail(planScreenId)
        }),
        queryClient.invalidateQueries({
          queryKey: ordersKeys.getOrdersByScreening(planScreenId)
        })
      ]);
      setSelectedSeats([]);
      setSelectedDiscountGroups({});
      setOpenQrDialog(false);
      qrDataRef.current = undefined;
      window.api?.sendQrClose();

      if (exportInvoice && canUpdate) {
        setInvoiceOrderId(orderId);
        setOpenInvoiceDialog(true);
      }
    },
    [
      canPrint,
      canUpdate,
      exportInvoice,
      handlePrint,
      message,
      planScreenId,
      queryClient,
      setSelectedSeats,
      syncLastSaleTotal
    ]
  );

  useEffect(() => {
    const cleanup = onOrderPaymentUpdated((data) => {
      if (data.paymentStatus !== 30) return;

      const currentQrData = qrDataRef.current;
      if (currentQrData && String(currentQrData.orderId) === String(data.orderId)) {
        void handleQrPaymentSuccess(Number(data.orderId), currentQrData.orderTotal);
        return;
      }
    });

    return cleanup;
  }, [handleQrPaymentSuccess]);

  const totalPrice = useMemo(
    () => selectedSeats.reduce((acc, cur) => acc + cur.price, 0),
    [selectedSeats]
  );

  useEffect(() => {
    setPaperVoucherLines([]);
    setOpenPaperVoucherDialog(false);
  }, [planScreenId]);

  useEffect(() => {
    if (selectedSeats.length === 0 || cancelMode) {
      setPaperVoucherLines((current) => (current.length ? [] : current));
      setOpenPaperVoucherDialog(false);
    }
  }, [cancelMode, selectedSeats.length]);

  // Giai đoạn 1 voucher giấy chỉ thanh toán tiền mặt: bỏ chọn QR.
  useEffect(() => {
    if (isPaperVoucherSale) {
      setPaymentMethod((current) => (current.length ? [] : current));
    }
  }, [isPaperVoucherSale]);

  // Đổi ghế/giảm giá/thẻ VIP hoặc rời luồng voucher giấy: phải quẹt lại thẻ cho đơn mới.
  useEffect(() => {
    setVipSelection(null);
  }, [isPaperVoucherSale, planScreenId, selectedDiscountGroups, selectedSeats, vipCard]);

  useEffect(() => {
    const allowedKeys = new Set(selectedSeats.map((seat) => getSeatDiscountKey(seat)));

    setSelectedDiscountGroups((prev) => {
      const nextEntries = Object.entries(prev).filter(
        ([key, discountId]) => allowedKeys.has(key) && discountId
      );

      if (nextEntries.length === Object.keys(prev).length) {
        return prev;
      }

      return Object.fromEntries(nextEntries);
    });
  }, [selectedSeats]);

  const discountGroupsPayload = useMemo(() => {
    if (selectedSeats.length === 0) return undefined;

    const grouped = new Map<number, string[]>();

    selectedSeats.forEach((seat) => {
      const seatKey = getSeatDiscountKey(seat);
      const discountId = selectedDiscountGroups[seatKey];

      if (!discountId) return;

      const current = grouped.get(discountId) || [];
      current.push(seat.seat);
      grouped.set(discountId, current);
    });

    if (grouped.size === 0) return undefined;

    return Array.from(grouped.entries()).map(([discountId, chairIndices]) => ({
      discountId,
      chairIndices
    }));
  }, [selectedDiscountGroups, selectedSeats]);

  // Body báo giá = body tạo đơn tiền mặt + voucher giấy; số tiền khách trả do backend tính.
  const paperVoucherQuoteDto = useMemo<OrderQuoteDto | null>(() => {
    if (!isPaperVoucherSale || cancelMode || selectedSeats.length === 0) return null;
    if (!posName || !posShortName) return null;

    return {
      planScreenId,
      floorNo: selectedSeats[0]?.floor || 1,
      paymentMethodSystemName: PAPER_VOUCHER_PAYMENT_METHOD,
      posName,
      posShortName,
      isInvitation: false,
      customerId: vipSelection?.customerId,
      memberCardCode: vipSelection?.memberCardCode,
      voucherCode: vipSelection?.voucherCode,
      pointCard: vipSelection?.pointCard,
      pointReward: vipSelection?.pointReward,
      discountGroups: discountGroupsPayload,
      hasManualInvoice: exportInvoice,
      ...buildSeatFieldsByFloor(selectedSeats),
      paperVouchers: paperVoucherLines.map(({ batchId, quantity, faceValue }) => ({
        batchId,
        quantity,
        faceValue
      }))
    };
  }, [
    cancelMode,
    discountGroupsPayload,
    exportInvoice,
    isPaperVoucherSale,
    paperVoucherLines,
    planScreenId,
    posName,
    posShortName,
    selectedSeats,
    vipSelection
  ]);
  const paperVoucherQuote = usePaperVoucherOrderQuote(paperVoucherQuoteDto);
  const isPaperVoucherQuotePending = !!paperVoucherQuoteDto && !paperVoucherQuote.isReady;

  useEffect(() => {
    paperVoucherRequestIdRef.current = null;
  }, [paperVoucherQuote.selectionKey]);

  /** Body tạo đơn có voucher giấy từ báo giá đang hiển thị; `null` khi chưa thể bán. */
  const preparePaperVoucherOrder = () => {
    const { quote, errorMessage, requestKey } = paperVoucherQuote;

    if (!paperVoucherQuoteDto || !quote) {
      message.error(errorMessage ?? PAPER_VOUCHER_QUOTE_PENDING_MESSAGE);
      return null;
    }

    const allowedMethods = quote.allowedPaymentMethods ?? [];
    if (allowedMethods.length > 0 && !allowedMethods.includes(PAPER_VOUCHER_PAYMENT_METHOD)) {
      message.error(PAPER_VOUCHER_CASH_ONLY_MESSAGE);
      return null;
    }

    paperVoucherRequestIdRef.current ??= createPaperVoucherRequestId();
    const body: OrderDto = {
      ...paperVoucherQuoteDto,
      paperVoucherRequestId: paperVoucherRequestIdRef.current,
      paperVoucherQuoteHash: quote.quoteHash,
      expectedFinalOrderTotal: quote.finalOrderTotal
    };

    return { body, requestKey };
  };

  const handlePaperVoucherOrderError = (error: unknown, requestKey: string | null) => {
    const failure = classifyPaperVoucherOrderError(error);

    // Cùng lần bán (mất mạng/5xx, báo giá đổi) giữ mã request; còn lại là lần bán mới với mã mới.
    if (failure.kind === "stale-batch" || failure.kind === "rejected") {
      paperVoucherRequestIdRef.current = null;
    }

    if (failure.kind === "quote-changed") {
      if (failure.quote) {
        paperVoucherQuote.replaceQuote(failure.quote, requestKey);
      } else {
        paperVoucherQuote.retry();
      }
      message.warning(PAPER_VOUCHER_QUOTE_CHANGED_MESSAGE);
      return;
    }

    // Danh sách lô được `useCreateOrder` tải lại; báo giá lại để hiển thị trạng thái mới.
    if (failure.kind === "stale-batch") {
      paperVoucherQuote.retry();
    }

    message.error(failure.message);
  };

  const onBooking = async (params?: BookingParams) => {
    if (isPlanScreeningPast) {
      message.error("Ca chiếu đã qua, không thể thao tác");
      return;
    }

    if (hasPaperVoucher && !paperVoucherSaleEnabled) {
      message.error(PAPER_VOUCHER_BLOCKS_SALE_MESSAGE);
      return;
    }

    if (!posName || !posShortName) {
      message.error("Chưa cấu hình máy POS, không thể thao tác");
      return;
    }

    const paperVoucherOrder = isPaperVoucherSale ? preparePaperVoucherOrder() : null;
    if (isPaperVoucherSale && !paperVoucherOrder) {
      return;
    }

    if (verifySelectedSeats && !(await verifySelectedSeats())) {
      return;
    }

    const floorNo = selectedSeats[0]?.floor || 1;

    const body: OrderDto = paperVoucherOrder?.body ?? {
      planScreenId,
      floorNo,
      paymentMethodSystemName: paymentMethod.length > 0 ? paymentMethod[0] : "POS",
      posName,
      posShortName,
      isInvitation: false,
      customerId: params?.customerId,
      memberCardCode: params?.memberCardCode,
      voucherCode: params?.voucherCode,
      pointCard: params?.pointCard,
      pointReward: params?.pointReward,
      discountGroups: discountGroupsPayload,
      hasManualInvoice: exportInvoice ? true : false,
      ...buildSeatFieldsByFloor(selectedSeats)
    };

    createOrder.mutate(body, {
      onSuccess: async (order: OrderResponseProps) => {
        const isPaymentQr = !paperVoucherOrder && paymentMethod.length > 0;
        if (paperVoucherOrder) {
          paperVoucherRequestIdRef.current = null;
        }
        if (isPaymentQr) {
          try {
            const responseQr = await createQr.mutateAsync({
              orderId: order.id,
              paymentMethod: paymentMethod[0],
              shortName: posShortName
            });

            const body: QrDialogData = {
              ...responseQr,
              orderId: order.id,
              orderTotal: order.orderTotal,
              orderDiscount: order.orderDiscount,
              paymentMethodSystemName: order.paymentMethodSystemName,
              voucherCode: order.voucherCode,
              createdOnUtc: order.createdOnUtc,
              filmName: data.filmInfo.filmName,
              roomName: data.roomInfo.name,
              projectDate: data.projectDate,
              projectTime: data.projectTime,
              orderStatusId: order.orderStatusId,
              paymentStatusId: order.paymentStatusId,
              shippingStatusId: order.shippingStatusId,
              seats: selectedSeats.map((seat) => seat.code).join(", ")
            };

            qrDataRef.current = body;
            setQrData(body);
            setOpenQrDialog(true);
            window.api.sendQrOpen(body);
          } catch {
            onUpdateOrder(
              order.id,
              order.shippingStatusId,
              order.paymentStatusId,
              planScreenId,
              "QR_FAILED"
            );
          }
          return;
        }

        syncLastSaleTotal(order.orderTotal);
        message.success("Tạo đơn thành công");
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: planScreeningsKeys.getDetail(planScreenId)
          }),
          queryClient.invalidateQueries({
            queryKey: ordersKeys.getOrdersByScreening(planScreenId)
          })
        ]);
        setSelectedSeats([]);
        setSelectedDiscountGroups({});
        if (paperVoucherOrder) {
          setPaperVoucherLines([]);
          setVipSelection(null);
        }
        if (canPrint) {
          handlePrint(order.id);
        }

        if (exportInvoice && canUpdate) {
          setInvoiceOrderId(order.id);
          setOpenInvoiceDialog(true);
        }
      },
      onError: (error: unknown) => {
        if (paperVoucherOrder) {
          handlePaperVoucherOrderError(error, paperVoucherOrder.requestKey);
          return;
        }

        message.error(getApiErrorMessage(error, "Tạo đơn thất bại"));
      }
    });
  };

  const onVipCardConfirm = (params?: BookingParams) => {
    if (!isPaperVoucherSale) {
      void onBooking(params);
      return;
    }

    // Đơn có voucher giấy: báo giá lại với thẻ thành viên, thu ngân bấm In vé để xác nhận số tiền.
    setVipSelection(params ?? {});
    message.success("Đã áp dụng thẻ thành viên. Kiểm tra số tiền khách cần trả rồi bấm In vé.");
  };

  const onReserveSeats = async () => {
    if (isPlanScreeningPast) {
      message.error("Ca chiếu đã qua, không thể thao tác");
      return;
    }

    if (isPaperVoucherSale) {
      message.error(PAPER_VOUCHER_RESERVE_BLOCKED_MESSAGE);
      return;
    }

    if (!posName || !posShortName) {
      message.error("Chưa cấu hình máy POS, không thể thao tác");
      return;
    }

    if (verifySelectedSeats && !(await verifySelectedSeats())) {
      return;
    }

    const floorNo = selectedSeats[0]?.floor || 1;

    const body: OrderDto = {
      planScreenId,
      floorNo,
      paymentMethodSystemName: paymentMethod.length > 0 ? paymentMethod[0] : "POS",
      posName,
      posShortName,
      isInvitation: false,
      action: "RESERVE_SEAT",
      discountGroups: discountGroupsPayload,
      ...buildSeatFieldsByFloor(selectedSeats)
    };

    createOrder.mutate(body, {
      onSuccess: async () => {
        message.success("Giữ chỗ thành công");
        setSelectedSeats([]);
        setSelectedDiscountGroups({});
        queryClient.invalidateQueries({
          queryKey: planScreeningsKeys.getDetail(planScreenId)
        });
        queryClient.invalidateQueries({ queryKey: ordersKeys.getOrdersByScreening(planScreenId) });
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Giữ chỗ thất bại"));
      }
    });
  };

  const priceDiscount = useMemo(() => {
    return selectedSeats.reduce((total, seat) => {
      const seatKey = getSeatDiscountKey(seat);
      const discountId = selectedDiscountGroups[seatKey];
      const discount = discountId ? discountsById.get(discountId) : undefined;

      return total + calculateSeatDiscount(seat, discount);
    }, 0);
  }, [discountsById, selectedDiscountGroups, selectedSeats]);

  const items: DescriptionsProps["items"] = [
    {
      key: "1",
      label: <span className="text-xs font-semibold">Số vé</span>,
      children: (
        <p className="text-right flex-1 font-bold text-xs self-center">{selectedSeats.length}</p>
      )
    },
    {
      key: "2",
      label: <span className="text-xs font-semibold">Tiền vé</span>,
      children: (
        <p className="text-right flex-1 font-bold text-xs self-center">{formatMoney(totalPrice)}</p>
      )
    },
    {
      key: "3",
      label: <span className="text-xs font-semibold">Giảm giá</span>,
      children: (
        <p
          onClick={() => {
            if (!cancelMode) {
              setOpenDiscount(true);
            }
          }}
          className={cn(
            "text-right flex-1 font-bold text-xs self-center",
            cancelMode ? "cursor-not-allowed text-slate-400 dark:text-slate-500" : "cursor-pointer"
          )}
        >
          {priceDiscount > 0 || Object.keys(selectedDiscountGroups).length > 0
            ? formatMoney(priceDiscount)
            : "Chọn giảm giá"}
        </p>
      )
    },
    {
      key: "4",
      label: <span className="text-xs font-semibold">Thành tiền</span>,
      children: (
        <p
          data-testid="order-final-amount"
          className="text-right flex-1 font-bold text-blue-600 self-center dark:text-amber-200"
        >
          {/* Đơn có voucher giấy: hiển thị số tiền backend báo giá, không tự tính. */}
          {isPaperVoucherSale
            ? paperVoucherQuote.quote
              ? formatMoney(paperVoucherQuote.quote.finalOrderTotal)
              : "--"
            : formatMoney(totalPrice - priceDiscount)}
        </p>
      )
    }
  ];

  const printBlockedReason = !hasPaperVoucher
    ? undefined
    : !paperVoucherSaleEnabled
      ? PAPER_VOUCHER_BLOCKS_SALE_MESSAGE
      : isPaperVoucherQuotePending
        ? (paperVoucherQuote.errorMessage ?? PAPER_VOUCHER_QUOTE_PENDING_MESSAGE)
        : undefined;

  const onChange: GetProp<typeof Checkbox.Group, "onChange"> = (checkedValues) => {
    const last = checkedValues.slice(-1) as string[];
    setPaymentMethod(last);
  };

  const onUpdateOrder = (
    orderId: number,
    shippingStatusId: number,
    paymentStatusId: number,
    planScreenId: number,
    error: "PAYMENT_FAILED" | "QR_FAILED"
  ) => {
    updateOrder.mutate(
      {
        id: orderId,
        dto: {
          orderStatusId: OrderStatus.FAIL,
          shippingStatusId: shippingStatusId,
          paymentStatusId: paymentStatusId,
          planScreenId
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreenId) });
          queryClient.invalidateQueries({
            queryKey: ordersKeys.getOrdersByScreening(planScreenId)
          });
          const errorMessage =
            error === "PAYMENT_FAILED"
              ? "Đơn đã được kết thúc do thanh toán không thành công"
              : "Đơn đã được kết thúc do tạo QR thất bại";
          message.error(errorMessage);
        },
        onError: (error: unknown) => {
          message.error(getApiErrorMessage(error, "Chuyển trạng thái đơn thất bại"));
        }
      }
    );
  };

  const onCheckQrTransaction = async () => {
    if (!qrData) return;

    try {
      setIsCheckingQrTransaction(true);
      await ordersApi.checkTransaction({ orderId: qrData.orderId });

      const orderDetail = await queryClient.fetchQuery({
        queryKey: ordersKeys.getDetail(qrData.orderId),
        queryFn: () => ordersApi.getDetail(qrData.orderId)
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: planScreeningsKeys.getDetail(planScreenId)
        }),
        queryClient.invalidateQueries({
          queryKey: ordersKeys.getOrdersByScreening(planScreenId)
        })
      ]);

      if (resolveOrderPaymentStatus(orderDetail.order) === PaymentStatus.PAID) {
        await handleQrPaymentSuccess(qrData.orderId, qrData.orderTotal);
        return;
      }

      message.warning("Giao dịch chưa được ghi nhận thành công. Vui lòng kiểm tra lại.");
    } catch {
      message.error("Kiểm tra lại giao dịch thanh toán thất bại");
    } finally {
      setIsCheckingQrTransaction(false);
    }
  };

  const onCancelSeats = (values?: FieldType) => {
    if (isPlanScreeningPast) {
      message.error("Ca chiếu đã qua, không thể thao tác");
      return;
    }

    const selectedSeatIndicesByFloor = {
      listChairIndexF1: selectedSeats.filter((seat) => seat.floor === 1).map((seat) => seat.seat),
      listChairIndexF2: selectedSeats.filter((seat) => seat.floor === 2).map((seat) => seat.seat),
      listChairIndexF3: selectedSeats.filter((seat) => seat.floor === 3).map((seat) => seat.seat)
    };

    const body: CancelOrderDto = {
      planScreenId,
      orderIds: cancelOrderSelection ? [cancelOrderSelection.orderId] : undefined,
      cancelReasonId: values?.cancelReasonId || 1,
      isRefund: values?.isRefund || false,
      ...selectedSeatIndicesByFloor
    };

    cancelOrder.mutate(body, {
      onSuccess: () => {
        setSelectedSeats([]);
        onCancelOrderSelectionClear();
        setOpenCancelSeats(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreenId) });
        queryClient.invalidateQueries({ queryKey: ordersKeys.getOrdersByScreening(planScreenId) });
        message.success("Hủy vé thành công");
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Hủy vé thất bại"));
      }
    });
  };

  const onCancelReserve = async () => {
    if (isPlanScreeningPast) {
      message.error("Ca chiếu đã qua, không thể thao tác");
      return;
    }

    const selectedSeatCodes = new Set(
      selectedSeats.map((seat) => `${seat.floor}-${seat.code.trim().toUpperCase()}`)
    );
    const orderIds = Array.from(
      new Set(
        (screeningOrders || [])
          .filter((order) =>
            order.items.some((item) =>
              [item.listChairValueF1, item.listChairValueF2, item.listChairValueF3].some(
                (seatValues, floorIndex) =>
                  (seatValues || "")
                    .split(",")
                    .map((seat) => seat.trim())
                    .filter(Boolean)
                    .some((seatCode) =>
                      selectedSeatCodes.has(`${floorIndex + 1}-${seatCode.toUpperCase()}`)
                    )
              )
            )
          )
          .map((order) => order.id)
      )
    );

    if (orderIds.length === 0) {
      message.error("Không xác định được đơn giữ chỗ của các ghế đã chọn");
      return;
    }

    setIsCancelReservePending(true);

    try {
      await ordersApi.cancelReserve({
        listChairIndexF1: selectedSeats.filter((seat) => seat.floor === 1).map((seat) => seat.seat),
        listChairIndexF2: selectedSeats.filter((seat) => seat.floor === 2).map((seat) => seat.seat),
        listChairIndexF3: selectedSeats.filter((seat) => seat.floor === 3).map((seat) => seat.seat),
        orderIds
      });

      setSelectedSeats([]);
      setSelectedDiscountGroups({});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreenId) }),
        queryClient.invalidateQueries({ queryKey: ordersKeys.getOrdersByScreening(planScreenId) })
      ]);
      message.success("Hủy giữ chỗ thành công");
    } catch (error) {
      message.error(getApiErrorMessage(error, "Hủy giữ chỗ thất bại"));
    } finally {
      setIsCancelReservePending(false);
    }
  };

  const disableActions =
    createOrder.isPending ||
    cancelOrder.isPending ||
    isCancelReservePending ||
    isPlanScreeningPast ||
    updateOrder.isPending;
  const disableNonCancelActions = disableActions || cancelMode || isSeatSelectionPending;

  return (
    <div
      data-seat-selection-ignore="true"
      className={cn(
        "shrink-0 border-t border-emerald-900/20 bg-emerald-100/50 px-2 backdrop-blur-md dark:border-amber-100/18 dark:bg-[linear-gradient(180deg,rgba(24,22,24,0.98),rgba(8,9,12,0.98))] dark:shadow-[0_-18px_48px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(250,240,220,0.12)]",
        isCustomerView && "hidden"
      )}
    >
      {hasPaperVoucher && (
        <PaperVoucherSummary
          lines={paperVoucherLines}
          ticketCount={selectedSeats.length}
          quote={
            isPaperVoucherSale
              ? {
                  quote: paperVoucherQuote.quote,
                  isLoading: paperVoucherQuote.isLoading,
                  errorMessage: paperVoucherQuote.errorMessage,
                  onRetry: paperVoucherQuote.retry
                }
              : undefined
          }
          memberCardCode={vipSelection?.memberCardCode}
          disabled={disableNonCancelActions}
          onEdit={() => setOpenPaperVoucherDialog(true)}
          onClear={() => setPaperVoucherLines([])}
        />
      )}
      <div className="p-2 flex gap-2 items-center justify-center">
        <div className="flex flex-col gap-2">
          <Checkbox checked={cancelMode} onChange={(e) => setCancelMode(e.target.checked)}>
            Hủy vé
          </Checkbox>
          <Button
            variant="outlined"
            color="danger"
            disabled={
              !canUpdate ||
              !cancelMode ||
              !hasValidCancelSelection ||
              selectedSeats.length === 0 ||
              isPlanScreeningPast ||
              cancelOrder.isPending
            }
            onClick={() => setOpenCancelSeats(true)}
          >
            Hủy vé
          </Button>
          <Modal
            title="Hủy toàn bộ đơn vé?"
            open={openCancelSeats}
            okText="Hủy toàn bộ đơn"
            cancelText="Quay lại"
            onOk={() => {
              form.submit();
            }}
            onCancel={() => {
              if (cancelOrder.isPending) return;
              setOpenCancelSeats(false);
              form.resetFields();
            }}
            okButtonProps={{
              danger: true,
              loading: cancelOrder.isPending,
              disabled: !hasValidCancelSelection
            }}
            cancelButtonProps={{
              disabled: cancelOrder.isPending
            }}
            closable={!cancelOrder.isPending}
            keyboard={!cancelOrder.isPending}
            mask={{ closable: !cancelOrder.isPending }}
            forceRender
            modalRender={(dom) => (
              <Form<FieldType>
                form={form}
                name="basic"
                style={{ maxWidth: 600 }}
                onFinish={(values) => {
                  onCancelSeats(values);
                }}
                autoComplete="off"
                layout="vertical"
              >
                {dom}
              </Form>
            )}
            destroyOnHidden
          >
            {cancelOrderSelection && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-950 dark:border-red-800/70 dark:bg-red-950/35 dark:text-red-100">
                <p className="font-semibold">
                  Đơn #{cancelOrderSelection.orderId} gồm {cancelOrderSelection.seats.length} ghế:
                </p>
                <p className="mt-1 wrap-break-word">{cancelSeatList}</p>
                <p className="mt-2 text-red-800 dark:text-red-200">
                  Bạn không thể hủy riêng từng ghế. Sau khi hủy, bạn cần đặt lại đơn mới.
                </p>
              </div>
            )}
            <Form.Item<FieldType>
              name="cancelReasonId"
              label="Lý do hủy vé"
              rules={[{ required: true, message: "Chọn lý do hủy vé" }]}
            >
              <Select
                loading={isFetching || isFetchingNextPage}
                options={options}
                placeholder="Chọn lý do hủy vé"
                onPopupScroll={(e) => {
                  const target = e.target as HTMLElement;
                  if (
                    hasNextPage &&
                    !isFetchingNextPage &&
                    target.scrollHeight - target.scrollTop <= target.clientHeight + 50
                  ) {
                    fetchNextPage();
                  }
                }}
                allowClear
              />
            </Form.Item>

            <Form.Item<FieldType> name="isRefund" valuePropName="checked">
              <Checkbox>Hủy vé hoàn tiền</Checkbox>
            </Form.Item>
          </Modal>
        </div>
        <div className="flex-1 max-w-120 rounded-md border border-transparent bg-white px-4 py-2 backdrop-blur-md dark:border-amber-100/14 dark:bg-[#181518] dark:shadow-[0_10px_26px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(250,240,220,0.08)]">
          <Descriptions size="small" items={items} column={2} />
        </div>
        <div className="text-xs">
          <Checkbox
            className="mt-1"
            checked={exportInvoice}
            disabled={!canUpdate || isPlanScreeningPast || cancelMode}
            onChange={(e) => setExportInvoice(e.target.checked)}
          >
            <span className="text-xs">Xuất hóa đơn</span>
          </Checkbox>
          <p className="text-slate-500 dark:text-stone-300">Tiền vừa bán:</p>
          <p className="font-bold text-emerald-700 dark:text-amber-200 text-sm">
            {formatMoney(lastSaleTotal)}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          <Tooltip title={isPaperVoucherSale ? PAPER_VOUCHER_RESERVE_BLOCKED_MESSAGE : undefined}>
            <Button
              variant="outlined"
              color="green"
              aria-busy={isSeatSelectionPending}
              disabled={
                disableNonCancelActions ||
                !canUpdate ||
                selectedSeats.length === 0 ||
                isPaperVoucherSale
              }
              onClick={() => void onReserveSeats()}
            >
              Giữ chỗ
            </Button>
          </Tooltip>
          <Button
            variant="outlined"
            danger
            disabled={disableNonCancelActions || !canUpdate || selectedSeats.length === 0}
            onClick={() => void onCancelReserve()}
          >
            Hủy giữ
          </Button>
        </div>

        <div className="flex gap-3">
          {canCreate && !isPlanScreeningPast && (
            <Badge count={paperVoucherLines.reduce((total, line) => total + line.quantity, 0)}>
              <Button
                className="flex flex-col gap-0.5"
                style={{ height: 72 }}
                icon={<TicketPercent size={22} />}
                aria-busy={isSeatSelectionPending}
                disabled={disableNonCancelActions || selectedSeats.length === 0}
                onClick={() => setOpenPaperVoucherDialog(true)}
              >
                <span className="text-xs font-semibold">Voucher giấy</span>
              </Button>
            </Badge>
          )}
          <div className="flex flex-col">
            <Checkbox
              checked={vipCard}
              disabled={disableNonCancelActions || !canCreate}
              onChange={(e) => setVipCard(e.target.checked)}
            >
              Quẹt thẻ VIP
            </Checkbox>
            <Tooltip title={isPaperVoucherSale ? PAPER_VOUCHER_CASH_ONLY_MESSAGE : undefined}>
              <Checkbox.Group
                className="flex flex-col"
                value={paymentMethod}
                disabled={disableNonCancelActions || !canCreate || isPaperVoucherSale}
                onChange={onChange}
                options={paymentTypes}
              />
            </Tooltip>
          </div>
          <div>
            <Tooltip title={printBlockedReason}>
              <Button
                type="primary"
                size="large"
                className="flex flex-col w-full h-full gap-1"
                style={{ height: 72 }}
                onClick={() => {
                  // Đơn có voucher giấy đã quẹt thẻ: thẻ đã nằm trong báo giá, bấm In vé để thu tiền.
                  if (vipCard && !(isPaperVoucherSale && vipSelection)) {
                    setOpenVipCardDialog(true);
                    return;
                  }

                  void onBooking();
                }}
                aria-busy={isSeatSelectionPending}
                disabled={
                  createOrder.isPending ||
                  isSeatSelectionPending ||
                  selectedSeats.length === 0 ||
                  createQr.isPending ||
                  cancelMode ||
                  !canCreate ||
                  isPlanScreeningPast ||
                  (hasPaperVoucher && !paperVoucherSaleEnabled) ||
                  isPaperVoucherQuotePending
                }
              >
                <img src={ticketIcon} width={28} height={28} alt="icon" />
                <span className="text-base font-bold">In vé</span>
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      <DiscountPopup
        data={discounts?.data}
        openDiscount={openDiscount}
        selectedSeats={selectedSeats}
        value={selectedDiscountGroups}
        setOpenDiscount={setOpenDiscount}
        onChange={setSelectedDiscountGroups}
      />

      {openQrDialog && qrData && (
        <QrCodeDialog
          open={openQrDialog}
          onCancel={() => {
            onUpdateOrder(
              qrData.orderId,
              qrData.shippingStatusId,
              qrData.paymentStatusId,
              planScreenId,
              "PAYMENT_FAILED"
            );
            setOpenQrDialog(false);
            qrDataRef.current = undefined;
            window.api?.sendQrClose();
          }}
          onCheckTransaction={() => void onCheckQrTransaction()}
          dataQr={qrData}
          isCheckingTransaction={isCheckingQrTransaction}
        />
      )}

      {openVipCardDialog && (
        <VipCardDialog
          open={openVipCardDialog}
          onCancel={() => setOpenVipCardDialog(false)}
          totalPrice={totalPrice - priceDiscount}
          onBooking={onVipCardConfirm}
          planScreenId={planScreenId}
          selectedSeats={selectedSeats}
          hasSeatTypeDiscount={Object.keys(selectedDiscountGroups).length > 0}
          filmVersionCode={data.filmInfo.versionCode}
        />
      )}

      {openPaperVoucherDialog && (
        <PaperVoucherDialog
          open={openPaperVoucherDialog}
          value={paperVoucherLines}
          ticketCount={selectedSeats.length}
          ticketAmount={totalPrice}
          discountAmount={priceDiscount}
          onCancel={() => setOpenPaperVoucherDialog(false)}
          onApply={(lines) => {
            setPaperVoucherLines(lines);
            setOpenPaperVoucherDialog(false);
          }}
        />
      )}

      {openInvoiceDialog && invoiceOrderId && (
        <InvoiceDialog
          open={openInvoiceDialog}
          onOpenChange={(open) => {
            setOpenInvoiceDialog(open);
            if (!open) {
              setInvoiceOrderId(undefined);
            }
          }}
          orderId={invoiceOrderId}
        />
      )}
    </div>
  );
};

export default Actions;
