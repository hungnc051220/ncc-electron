import {
  CancelOrderDto,
  CreateQrOrderDto,
  OrderDto,
  OrderQuoteDto,
  ordersApi
} from "@renderer/api/orders.api";
import { getApiErrorCode, getApiErrorMessage, isRetryableApiError } from "@renderer/lib/apiError";
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
  formatPaymentMethod,
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
  OrderDetailProps,
  OrderResponseProps,
  PaymentType,
  PlanScreeningDetailProps,
  QrCodeResponseProps,
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
import {
  buildCancelOrderTarget,
  CancelOrderSelection,
  formatCancelSeatList
} from "./cancelOrderSelection";
import { getOrderCancelConflictMessage, isOrderCancelConflict } from "./paperVoucherCancelConflict";
import type { PaperVoucherSelectionLine } from "@renderer/features/paperVouchers/paperVoucherRedemption";
import { usePaperVoucherOrderQuote } from "@renderer/hooks/orders/usePaperVoucherOrderQuote";
import { TicketPercent } from "lucide-react";
import PaperVoucherDialog from "./PaperVoucherDialog";
import {
  buildPaperVoucherPayloadKey,
  canRecheckQrTransactionWithProvider,
  classifyPaperVoucherOrderError,
  createPaperVoucherQrWithRetry,
  createPaperVoucherRequestId,
  getPaperVoucherExistingOrderMessage,
  getPaperVoucherPaymentFallbackMessage,
  getPaperVoucherQrClosedMessage,
  getPaperVoucherQrPaidMessage,
  getPaperVoucherQrShortPaymentMessage,
  getPaperVoucherQrUnknownStateMessage,
  isPaperVoucherOutcomeUnknown,
  isPaperVoucherQrCreateRetryable,
  needsPaperVoucherQrReconciliation,
  PAPER_VOUCHER_QR_CLOSE_UNKNOWN_MESSAGE,
  PAPER_VOUCHER_QR_RECONCILIATION_TITLE,
  PAPER_VOUCHER_QR_RETRY_DELAYS_MS,
  type PaperVoucherQrCreateFailure,
  isPaperVoucherPaymentMethodAllowed,
  loadPaperVoucherAttempt,
  PAPER_VOUCHER_CASH_METHOD,
  PAPER_VOUCHER_NO_PAYMENT_METHOD_MESSAGE,
  PAPER_VOUCHER_PAYMENT_HINT,
  PAPER_VOUCHER_PREVIOUS_NOT_RECORDED_MESSAGE,
  PAPER_VOUCHER_QR_CLOSE_FAILED_MESSAGE,
  PAPER_VOUCHER_QR_ERROR_CODES,
  PAPER_VOUCHER_QR_WAITING_MESSAGE,
  PAPER_VOUCHER_QUOTE_CHANGED_MESSAGE,
  PAPER_VOUCHER_QUOTE_PENDING_MESSAGE,
  PAPER_VOUCHER_RECONCILE_FAILED_MESSAGE,
  PAPER_VOUCHER_REQUEST_IN_PROGRESS_MESSAGE,
  PAPER_VOUCHER_RESERVE_BLOCKED_MESSAGE,
  savePaperVoucherAttempt,
  resolvePaperVoucherQrState,
  toPaperVoucherReconcileDecision,
  type PaperVoucherAttempt
} from "./paperVoucherSale";
import { paperVoucherKeys } from "@renderer/hooks/paperVouchers/keys";

const LAST_SALE_TOTAL_KEY = "lastTotal";
/** Phần voucher giấy của lần bán gần nhất; không có khi đơn không dùng voucher giấy. */
const LAST_SALE_PAPER_VOUCHER_KEY = "lastPaperVoucher";
/** Số tiền khách trả thêm (tiền mặt/QR, backend đã xác nhận) của lần bán gần nhất có voucher giấy. */
const LAST_SALE_COLLECTED_KEY = "lastPaperVoucherCollected";

/** Phần voucher của lần bán gần nhất; bỏ qua khi màn hình khác đã xóa "Tiền vừa bán". */
const readLastSaleAmount = (key: string) =>
  sessionStorage.getItem(LAST_SALE_TOTAL_KEY) === null
    ? 0
    : Number(sessionStorage.getItem(key)) || 0;

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

/** Thao tác trên màn QR; mỗi lúc chỉ một thao tác (tạo lại QR, kiểm tra lại, kết thúc). */
type QrAction = "create" | "check" | "close";

/** Màn QR của đơn có voucher giấy khi chưa có mã QR (tạo QR lỗi): giữ thông tin đơn, chưa có mã. */
const EMPTY_QR_RESPONSE: QrCodeResponseProps = {
  referenceLabelCode: "",
  qrcode: "",
  accountName: "",
  accountNumber: "",
  accountBankName: ""
};

/** Ghép response `create-qr` vào màn QR; thông tin đơn/vé (và các lô voucher) giữ nguyên. */
const applyQrResponse = (base: QrDialogData, responseQr: QrCodeResponseProps): QrDialogData => {
  // Đơn có voucher giấy: QR chỉ thu phần còn lại (`transactionAmount` của create-qr).
  const paperVoucherAmounts = responseQr.paperVoucher ?? base.paperVoucher;

  return {
    ...responseQr,
    ...(paperVoucherAmounts && {
      paperVoucher: { ...paperVoucherAmounts, lines: base.paperVoucher?.lines }
    }),
    orderId: base.orderId,
    orderTotal: base.orderTotal,
    orderDiscount: base.orderDiscount,
    paymentMethodSystemName: base.paymentMethodSystemName,
    voucherCode: base.voucherCode,
    createdOnUtc: base.createdOnUtc,
    filmName: base.filmName,
    roomName: base.roomName,
    projectDate: base.projectDate,
    projectTime: base.projectTime,
    orderStatusId: base.orderStatusId,
    paymentStatusId: base.paymentStatusId,
    shippingStatusId: base.shippingStatusId,
    seats: base.seats
  };
};

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
  const { message, modal } = useAntdApp();

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
  // Tiền vừa bán = tổng đơn vừa bán (giá vé sau khuyến mại, như trước khi có voucher giấy). Đơn có
  // voucher giấy hiện thêm phần trả bằng voucher và số khách trả thêm; ba số này không thay nhau.
  const [lastSaleTotal, setLastSaleTotal] = useState(
    () => Number(sessionStorage.getItem(LAST_SALE_TOTAL_KEY)) || 0
  );
  const [lastSalePaperVoucher, setLastSalePaperVoucher] = useState(() =>
    readLastSaleAmount(LAST_SALE_PAPER_VOUCHER_KEY)
  );
  const [lastSaleCollected, setLastSaleCollected] = useState(() =>
    readLastSaleAmount(LAST_SALE_COLLECTED_KEY)
  );
  // Một thao tác QR tại một thời điểm: bấm liên tiếp "Kết thúc"/"Kiểm tra lại"/"Tạo lại QR" không gửi
  // request song song, không chạy dọn dẹp hai lần. Ref chặn ngay trong cùng một lần render.
  const qrActionRef = useRef<QrAction | null>(null);
  const [qrAction, setQrAction] = useState<QrAction | null>(null);
  // Đơn có voucher giấy chưa có mã QR (tạo QR lỗi): lý do hiển thị trên màn QR, request để tạo lại.
  const [qrUnavailableMessage, setQrUnavailableMessage] = useState<string | undefined>(undefined);
  const paperVoucherQrRequestRef = useRef<CreateQrOrderDto | null>(null);
  // Thông báo đối soát đang mở (theo đơn + nội dung): không mở trùng khi kiểm tra lại nhiều lần.
  const reconciliationNoticeRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  // Đơn có voucher giấy luôn đi luồng bán vé voucher giấy tại POS: voucher giấy là một nguồn thanh
  // toán; khách trả thêm phần còn lại theo báo giá backend. Không bao giờ chuyển sang đơn thường.
  const [paperVoucherLines, setPaperVoucherLines] = useState<PaperVoucherSelectionLine[]>([]);
  const [openPaperVoucherDialog, setOpenPaperVoucherDialog] = useState(false);
  // Bản nháp trong popup voucher giấy (`null` khi chưa đổi): đang mở popup thì báo giá theo bản
  // nháp để thu ngân thấy ngay số tiền trừ; đóng popup thì báo giá lại theo lựa chọn đã áp dụng.
  const [paperVoucherDraft, setPaperVoucherDraft] = useState<PaperVoucherSelectionLine[] | null>(
    null
  );
  const quotedPaperVoucherLines =
    openPaperVoucherDialog && paperVoucherDraft ? paperVoucherDraft : paperVoucherLines;
  const hasPaperVoucher = paperVoucherLines.length > 0;
  // Thẻ thành viên đã quẹt cho đơn có voucher giấy: phải có trong báo giá trước khi thu tiền.
  const [vipSelection, setVipSelection] = useState<BookingParams | null>(null);
  // Lần gửi tạo đơn có voucher giấy gần nhất: mã request gắn với đúng một payload. Chưa rõ kết quả
  // (mất mạng/5xx/đang xử lý) thì chỉ được gửi lại y nguyên; giao dịch khác phải tra cứu mã cũ trước.
  const paperVoucherAttemptRef = useRef<PaperVoucherAttempt | null>(null);
  paperVoucherAttemptRef.current ??= loadPaperVoucherAttempt();
  const [isReconcilingPaperVoucher, setIsReconcilingPaperVoucher] = useState(false);
  const setPaperVoucherAttempt = useCallback((attempt: PaperVoucherAttempt | null) => {
    paperVoucherAttemptRef.current = attempt;
    savePaperVoucherAttempt(attempt);
  }, []);

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

  /**
   * `orderTotal`: tổng đơn (không trừ voucher). Đơn có voucher giấy: `paperVoucher.voucherApplied` và
   * `paperVoucher.collected` (số khách trả thêm đã được backend xác nhận: tiền mặt hoặc QR đã nhận).
   */
  const syncLastSaleTotal = useCallback(
    (orderTotal: number, paperVoucher?: { voucherApplied: number; collected: number }) => {
      sessionStorage.setItem(LAST_SALE_TOTAL_KEY, orderTotal.toString());
      setLastSaleTotal(orderTotal);

      const voucherApplied = paperVoucher?.voucherApplied ?? 0;
      const collected = voucherApplied > 0 ? (paperVoucher?.collected ?? 0) : 0;
      if (voucherApplied > 0) {
        sessionStorage.setItem(LAST_SALE_PAPER_VOUCHER_KEY, voucherApplied.toString());
        sessionStorage.setItem(LAST_SALE_COLLECTED_KEY, collected.toString());
      } else {
        sessionStorage.removeItem(LAST_SALE_PAPER_VOUCHER_KEY);
        sessionStorage.removeItem(LAST_SALE_COLLECTED_KEY);
      }
      setLastSalePaperVoucher(voucherApplied);
      setLastSaleCollected(collected);
    },
    []
  );

  /** Bỏ lựa chọn voucher giấy và thẻ đã quẹt sau khi bán xong. */
  const clearPaperVoucherSale = useCallback(() => {
    setPaperVoucherLines((current) => (current.length ? [] : current));
    setOpenPaperVoucherDialog(false);
    setVipSelection(null);
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
    async (paidQr: QrDialogData) => {
      const { orderId } = paidQr;
      // Một lần cho mỗi QR: socket lặp (callback + polling), hoặc socket đua với "Kiểm tra lại", không
      // in vé/ghi nhận hai lần.
      const currentQr = qrDataRef.current;
      if (!currentQr || String(currentQr.orderId) !== String(orderId)) return;
      qrDataRef.current = undefined;
      // Chỉ gọi khi QR đã PAID. Tổng đơn giữ nguyên; đơn có voucher giấy: QR chỉ thu phần còn lại
      // (`remainingPayable` backend đã xác nhận cho mã QR này).
      syncLastSaleTotal(
        paidQr.paperVoucher?.orderTotal ?? paidQr.orderTotal ?? 0,
        paidQr.paperVoucher && {
          voucherApplied: paidQr.paperVoucher.voucherApplied,
          collected: paidQr.paperVoucher.remainingPayable
        }
      );
      if (paidQr.paperVoucher) {
        clearPaperVoucherSale();
        message.success(
          getPaperVoucherQrPaidMessage(paidQr.paperVoucher, paidQr.paymentMethodSystemName)
        );
      } else {
        message.success("Thanh toán thành công! Đang cập nhật dữ liệu...");
      }
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
      setQrUnavailableMessage(undefined);
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
      clearPaperVoucherSale,
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
        void handleQrPaymentSuccess(currentQrData);
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

  useEffect(() => {
    if (!openPaperVoucherDialog) setPaperVoucherDraft(null);
  }, [openPaperVoucherDialog]);

  // Đổi ghế/giảm giá/thẻ VIP hoặc rời luồng voucher giấy: phải quẹt lại thẻ cho đơn mới.
  useEffect(() => {
    setVipSelection(null);
  }, [hasPaperVoucher, planScreenId, selectedDiscountGroups, selectedSeats, vipCard]);

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

  // Body báo giá = body tạo đơn + voucher giấy; số tiền khách trả thêm do backend tính. Báo giá
  // không phụ thuộc phương thức thanh toán nên luôn gửi tiền mặt, đổi phương thức không báo giá lại.
  const paperVoucherQuoteDto = useMemo<OrderQuoteDto | null>(() => {
    if (quotedPaperVoucherLines.length === 0 || cancelMode || selectedSeats.length === 0) {
      return null;
    }
    if (!posName || !posShortName) return null;

    return {
      planScreenId,
      floorNo: selectedSeats[0]?.floor || 1,
      paymentMethodSystemName: PAPER_VOUCHER_CASH_METHOD,
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
      paperVouchers: quotedPaperVoucherLines.map(({ batchId, quantity, faceValue }) => ({
        batchId,
        quantity,
        faceValue
      }))
    };
  }, [
    cancelMode,
    discountGroupsPayload,
    exportInvoice,
    quotedPaperVoucherLines,
    planScreenId,
    posName,
    posShortName,
    selectedSeats,
    vipSelection
  ]);
  const paperVoucherQuote = usePaperVoucherOrderQuote(paperVoucherQuoteDto);
  const isPaperVoucherQuotePending = !!paperVoucherQuoteDto && !paperVoucherQuote.isReady;

  const paperVoucherAllowedMethods = paperVoucherQuote.quote?.allowedPaymentMethods;
  // Phương thức thu tiền (đơn có voucher giấy: thu phần còn lại); không chọn QR = tiền mặt.
  const selectedPaymentMethod = paymentMethod[0] ?? PAPER_VOUCHER_CASH_METHOD;

  // Voucher giấy chỉ đi với phương thức backend cho phép (tiền mặt, VietQR, VNPayQR). Phương thức đang
  // chọn không còn hợp lệ: chuyển về tiền mặt và báo thu ngân, không bán âm thầm.
  useEffect(() => {
    if (!hasPaperVoucher || paymentMethod.length === 0) return;
    if (isPaperVoucherPaymentMethodAllowed(paymentMethod[0], paperVoucherAllowedMethods)) return;

    setPaymentMethod([]);
    message.warning(getPaperVoucherPaymentFallbackMessage(paymentMethod[0]));
  }, [hasPaperVoucher, message, paperVoucherAllowedMethods, paymentMethod]);

  /** Body tạo đơn có voucher giấy (chưa có mã request) từ báo giá đang hiển thị; `null` khi chưa thể bán. */
  const preparePaperVoucherOrder = () => {
    const { quote, errorMessage, requestKey } = paperVoucherQuote;

    if (!paperVoucherQuoteDto || !quote) {
      message.error(errorMessage ?? PAPER_VOUCHER_QUOTE_PENDING_MESSAGE);
      return null;
    }

    // Kiểm lần cuối trước khi gửi: không bán với phương thức backend không cho phép.
    if (!isPaperVoucherPaymentMethodAllowed(selectedPaymentMethod, quote.allowedPaymentMethods)) {
      setPaymentMethod([]);
      message.error(
        selectedPaymentMethod === PAPER_VOUCHER_CASH_METHOD
          ? PAPER_VOUCHER_NO_PAYMENT_METHOD_MESSAGE
          : getPaperVoucherPaymentFallbackMessage(selectedPaymentMethod)
      );
      return null;
    }

    const body: OrderDto = {
      ...paperVoucherQuoteDto,
      paymentMethodSystemName: selectedPaymentMethod,
      paperVoucherQuoteHash: quote.quoteHash,
      expectedRemainingPayable: quote.remainingPayable
    };

    return { body, payloadKey: buildPaperVoucherPayloadKey(body), requestKey, quote };
  };

  type PaperVoucherOrder = NonNullable<ReturnType<typeof preparePaperVoucherOrder>>;

  /**
   * Cùng payload với lần gửi trước: gửi lại cùng mã (backend trả lại đơn nếu đã tạo). Payload khác:
   * mã mới. Lần gửi được coi là chưa rõ kết quả cho đến khi backend trả lời dứt khoát.
   */
  const bindPaperVoucherRequestId = (order: PaperVoucherOrder): PaperVoucherOrder => {
    const previous = paperVoucherAttemptRef.current;
    const requestId =
      previous?.payloadKey === order.payloadKey
        ? previous.requestId
        : createPaperVoucherRequestId();
    setPaperVoucherAttempt({ requestId, payloadKey: order.payloadKey, outcomeUnknown: true });
    return { ...order, body: { ...order.body, paperVoucherRequestId: requestId } };
  };

  const refreshAfterPaperVoucherSale = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreenId) }),
      queryClient.invalidateQueries({ queryKey: ordersKeys.getOrdersByScreening(planScreenId) }),
      queryClient.invalidateQueries({ queryKey: paperVoucherKeys.all })
    ]);

  /**
   * Tra cứu (chỉ đọc) lần gửi chưa rõ kết quả trước khi cho tạo giao dịch khác: đơn đã tạo thì không
   * bán lại; còn đang xử lý thì chờ; không có gì được ghi nhận (hoặc đã hủy) thì cho bán với mã mới.
   */
  const reconcilePaperVoucherAttempt = async (attempt: PaperVoucherAttempt) => {
    setIsReconcilingPaperVoucher(true);
    try {
      const status = await queryClient.fetchQuery({
        queryKey: ordersKeys.paperVoucherRequest(attempt.requestId),
        queryFn: () => ordersApi.getPaperVoucherRequestStatus(attempt.requestId),
        staleTime: 0
      });
      const decision = toPaperVoucherReconcileDecision(status);
      if (decision.kind === "in-progress") {
        message.warning(PAPER_VOUCHER_REQUEST_IN_PROGRESS_MESSAGE);
        return;
      }

      setPaperVoucherAttempt(null);
      await refreshAfterPaperVoucherSale();
      if (decision.kind === "existing-order") {
        setSelectedSeats([]);
        setSelectedDiscountGroups({});
        clearPaperVoucherSale();
        message.warning(getPaperVoucherExistingOrderMessage(decision.order));
        return;
      }
      message.warning(PAPER_VOUCHER_PREVIOUS_NOT_RECORDED_MESSAGE);
    } catch {
      // Vẫn chặn: lần gửi chưa rõ kết quả được giữ, lần bấm sau tra cứu lại.
      message.error(PAPER_VOUCHER_RECONCILE_FAILED_MESSAGE);
    } finally {
      setIsReconcilingPaperVoucher(false);
    }
  };

  const handlePaperVoucherOrderError = (
    error: unknown,
    { body, requestKey }: PaperVoucherOrder
  ) => {
    const failure = classifyPaperVoucherOrderError(error);

    // Chưa rõ kết quả: giữ lần gửi. Còn lại backend đã trả lời và không ghi gì: lần sau dùng mã mới.
    if (!isPaperVoucherOutcomeUnknown(failure)) {
      setPaperVoucherAttempt(null);
    }

    if (failure.kind === "in-progress") {
      message.warning(failure.message);
      return;
    }

    // Mã đã gắn với payload khác: gửi lại vô ích, tra cứu ngay kết quả của mã đó.
    if (failure.kind === "request-conflict") {
      message.error(failure.message);
      const attempt = paperVoucherAttemptRef.current;
      if (attempt) void reconcilePaperVoucherAttempt(attempt);
      return;
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

    // Phương thức không còn được phép: về tiền mặt và báo giá lại để lấy danh sách phương thức mới.
    if (failure.kind === "payment-method-not-allowed") {
      setPaymentMethod([]);
      paperVoucherQuote.retry();
      message.error(failure.message);
      if (body.paymentMethodSystemName !== PAPER_VOUCHER_CASH_METHOD) {
        message.warning(getPaperVoucherPaymentFallbackMessage(body.paymentMethodSystemName));
      }
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

    if (!posName || !posShortName) {
      message.error("Chưa cấu hình máy POS, không thể thao tác");
      return;
    }

    const paperVoucherDraft = hasPaperVoucher ? preparePaperVoucherOrder() : null;
    if (hasPaperVoucher && !paperVoucherDraft) {
      return;
    }

    // Lần gửi trước chưa rõ kết quả: chỉ gửi lại y nguyên. Giao dịch khác (đổi phương thức, số tiền,
    // lựa chọn, bỏ voucher) phải tra cứu mã cũ trước, không tạo đơn thứ hai.
    const pendingAttempt = paperVoucherAttemptRef.current;
    if (
      pendingAttempt?.outcomeUnknown &&
      pendingAttempt.payloadKey !== paperVoucherDraft?.payloadKey
    ) {
      await reconcilePaperVoucherAttempt(pendingAttempt);
      return;
    }

    if (verifySelectedSeats && !(await verifySelectedSeats())) {
      return;
    }

    const paperVoucherOrder = paperVoucherDraft && bindPaperVoucherRequestId(paperVoucherDraft);
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
        const isPaymentQr = body.paymentMethodSystemName !== PaymentType.POS;
        if (paperVoucherOrder) {
          setPaperVoucherAttempt(null);
        }
        if (isPaymentQr) {
          const qrRequest: CreateQrOrderDto = {
            orderId: order.id,
            paymentMethod: body.paymentMethodSystemName,
            shortName: posShortName
          };
          const paperVoucherLines = paperVoucherOrder?.quote.lines.map(
            ({ batchCode, quantity }) => ({
              batchCode,
              quantity
            })
          );
          // Màn QR chưa có mã: thông tin đơn/vé; mã QR ghép vào khi `create-qr` trả về.
          const pendingQr: QrDialogData = {
            ...EMPTY_QR_RESPONSE,
            ...(order.paperVoucher && {
              paperVoucher: {
                orderTotal: order.paperVoucher.orderTotal,
                voucherApplied: order.paperVoucher.voucherApplied,
                remainingPayable: order.paperVoucher.remainingPayable,
                lines: paperVoucherLines
              }
            }),
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

          // Đơn có voucher giấy: lỗi tạo QR không kết thúc đơn, không trả voucher (N6).
          if (paperVoucherOrder) {
            await startPaperVoucherQr(
              {
                ...pendingQr,
                paymentMethodSystemName:
                  order.paymentMethodSystemName ?? body.paymentMethodSystemName,
                paperVoucher: pendingQr.paperVoucher ?? {
                  orderTotal: paperVoucherOrder.quote.orderTotal,
                  voucherApplied: paperVoucherOrder.quote.voucherApplied,
                  remainingPayable: paperVoucherOrder.quote.remainingPayable,
                  lines: paperVoucherLines
                }
              },
              qrRequest
            );
            return;
          }

          try {
            const responseQr = await createQr.mutateAsync(qrRequest);
            openQrWithCode(applyQrResponse(pendingQr, responseQr));
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

        // Tiền mặt: đơn có voucher giấy chỉ thu phần còn lại, tổng đơn (giá vé) giữ nguyên.
        const paperVoucherPayment = paperVoucherOrder
          ? (order.paperVoucher ?? paperVoucherOrder.quote)
          : undefined;
        syncLastSaleTotal(
          order.orderTotal,
          paperVoucherPayment && {
            voucherApplied: paperVoucherPayment.voucherApplied,
            collected: paperVoucherPayment.remainingPayable
          }
        );
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
          clearPaperVoucherSale();
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
          handlePaperVoucherOrderError(error, paperVoucherOrder);
          return;
        }

        message.error(getApiErrorMessage(error, "Tạo đơn thất bại"));
      }
    });
  };

  const onVipCardConfirm = (params?: BookingParams) => {
    if (!hasPaperVoucher) {
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

    if (hasPaperVoucher) {
      message.error(PAPER_VOUCHER_RESERVE_BLOCKED_MESSAGE);
      return;
    }

    const pendingAttempt = paperVoucherAttemptRef.current;
    if (pendingAttempt?.outcomeUnknown) {
      await reconcilePaperVoucherAttempt(pendingAttempt);
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
        <p className="text-right flex-1 font-bold text-xs self-center whitespace-nowrap tabular-nums">
          {formatMoney(totalPrice)}
        </p>
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
            "text-right flex-1 font-bold text-xs self-center whitespace-nowrap tabular-nums",
            cancelMode ? "cursor-not-allowed text-slate-400 dark:text-slate-500" : "cursor-pointer",
            !cancelMode && priceDiscount > 0 && "text-red-600 dark:text-red-400"
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
        <Tooltip
          title={
            paperVoucherQuote.quote && hasPaperVoucher
              ? `Tổng tiền vé ${formatMoney(paperVoucherQuote.quote.orderTotal)} − voucher giấy ${formatMoney(paperVoucherQuote.quote.voucherApplied)}`
              : undefined
          }
        >
          <p
            data-testid="order-final-amount"
            className="text-right flex-1 font-bold whitespace-nowrap tabular-nums text-blue-600 self-center dark:text-amber-200"
          >
            {/* Số tiền khách phải trả. Đơn có voucher giấy: phần còn lại do backend báo giá. */}
            {hasPaperVoucher
              ? paperVoucherQuote.quote
                ? formatMoney(paperVoucherQuote.quote.remainingPayable)
                : "--"
              : formatMoney(totalPrice - priceDiscount)}
          </p>
        </Tooltip>
      )
    }
  ];

  // Đơn có voucher giấy chỉ dùng phương thức backend cho phép (`allowedPaymentMethods` của báo giá).
  const paymentOptions = hasPaperVoucher
    ? paymentTypes.map((option) => ({
        ...option,
        disabled: !isPaperVoucherPaymentMethodAllowed(option.value, paperVoucherAllowedMethods)
      }))
    : paymentTypes;

  const printBlockedReason = isPaperVoucherQuotePending
    ? (paperVoucherQuote.errorMessage ?? PAPER_VOUCHER_QUOTE_PENDING_MESSAGE)
    : undefined;

  // Chỉ một phương thức QR: giữ phương thức vừa chọn. Checkbox.Group trả giá trị theo thứ tự options,
  // nên phần tử cuối không phải lúc nào cũng là lựa chọn mới (VNPayQR → VietQR).
  const onChange: GetProp<typeof Checkbox.Group, "onChange"> = (checkedValues) => {
    const values = checkedValues as string[];
    const added = values.find((value) => !paymentMethod.includes(value));
    setPaymentMethod(added ? [added] : values.slice(-1));
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

  /** Màn QR đang mở cho đơn này (socket/kiểm tra lại chưa kết thúc nó). */
  const isQrOpenFor = (orderId: number) =>
    !!qrDataRef.current && String(qrDataRef.current.orderId) === String(orderId);

  /**
   * Chạy một thao tác QR, bỏ qua khi một thao tác khác đang chạy (double-click, bấm Kết thúc lúc đang
   * kiểm tra lại). Luôn nhả khóa khi xong, kể cả khi request lỗi.
   */
  const runQrAction = async (action: QrAction, work: () => Promise<void>) => {
    if (qrActionRef.current) return;
    qrActionRef.current = action;
    setQrAction(action);
    try {
      await work();
    } finally {
      qrActionRef.current = null;
      setQrAction(null);
    }
  };

  const finishPaperVoucherQr = () => {
    setOpenQrDialog(false);
    setQrUnavailableMessage(undefined);
    qrDataRef.current = undefined;
    paperVoucherQrRequestRef.current = null;
    window.api?.sendQrClose();
  };

  /** Mở màn QR khi đã có mã QR (đơn thường và đơn có voucher giấy). */
  const openQrWithCode = (qrBody: QrDialogData) => {
    qrDataRef.current = qrBody;
    setQrData(qrBody);
    setQrUnavailableMessage(undefined);
    setOpenQrDialog(true);
    window.api.sendQrOpen(qrBody);
  };

  /**
   * Đơn có voucher giấy chưa có mã QR: giữ màn QR (thông tin đơn, lý do) để thu ngân tạo lại QR, kiểm
   * tra lại hoặc kết thúc. Không gửi màn hình khách khi chưa có mã.
   */
  const showPaperVoucherQrPending = (pendingQr: QrDialogData, reason: string) => {
    qrDataRef.current = pendingQr;
    setQrData(pendingQr);
    setQrUnavailableMessage(reason);
    setOpenQrDialog(true);
  };

  /**
   * N7: đơn QR có voucher giấy đã được backend kết thúc/hủy: tải lại sơ đồ ghế, đơn của ca chiếu và chi
   * tiết đơn (ghế đã trả không còn hiện đang giữ). `vouchers`: thêm danh sách lô khi không đi qua
   * `useUpdateOrder` (hook đó đã tải lại lô).
   */
  const refreshAfterPaperVoucherQrClosed = (orderId: number, { vouchers = false } = {}) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreenId) }),
      queryClient.invalidateQueries({ queryKey: ordersKeys.getOrdersByScreening(planScreenId) }),
      queryClient.invalidateQueries({ queryKey: ordersKeys.getDetail(orderId) }),
      ...(vouchers ? [queryClient.invalidateQueries({ queryKey: paperVoucherKeys.all })] : [])
    ]);

  /** N9: thông báo đối soát phải được thu ngân xác nhận; không mở trùng cùng một nội dung. */
  const showPaperVoucherQrReconciliation = (orderId: number, content: string) => {
    const noticeKey = `${orderId}:${content}`;
    if (reconciliationNoticeRef.current === noticeKey) return;
    reconciliationNoticeRef.current = noticeKey;
    modal.warning({
      title: PAPER_VOUCHER_QR_RECONCILIATION_TITLE,
      content,
      okText: "Đã hiểu",
      afterClose: () => {
        if (reconciliationNoticeRef.current === noticeKey) reconciliationNoticeRef.current = null;
      }
    });
  };

  const readPaperVoucherQrOrder = (orderId: number) =>
    queryClient.fetchQuery<OrderDetailProps>({
      queryKey: ordersKeys.getDetail(orderId),
      queryFn: () => ordersApi.getDetail(orderId),
      staleTime: 0
    });

  /**
   * Đơn có voucher giấy: trạng thái thật theo backend (Order + paperVoucher + giao dịch QR). Chỉ báo
   * thành công và in vé khi voucher đã APPLIED (đơn hoàn tất). Giao dịch đã báo thành công nhưng đơn
   * còn chờ: chuyển đơn sang thành công (backend kiểm số tiền) rồi đọc lại đơn. Không đọc được đơn:
   * trạng thái chưa xác định, giữ màn QR, không in vé, không trả voucher.
   * `canComplete = false`: đã thử chuyển thành công trong lần này, không gửi lại.
   */
  const settlePaperVoucherQr = async (
    paidQr: QrDialogData,
    {
      waitingMessage = PAPER_VOUCHER_QR_WAITING_MESSAGE,
      canComplete = true
    }: { waitingMessage?: string; canComplete?: boolean } = {}
  ): Promise<void> => {
    const { orderId } = paidQr;
    if (!isQrOpenFor(orderId)) return;

    let orderDetail: OrderDetailProps;
    try {
      orderDetail = await readPaperVoucherQrOrder(orderId);
    } catch {
      if (isQrOpenFor(orderId)) message.error(getPaperVoucherQrUnknownStateMessage(orderId));
      return;
    }
    // Socket/polling đã hoàn tất màn QR này trong lúc chờ: không báo hay in thêm lần nào.
    if (!isQrOpenFor(orderId)) return;

    const state = resolvePaperVoucherQrState(orderDetail);
    if (state === "paid") {
      await handleQrPaymentSuccess(paidQr);
      return;
    }
    if (state === "received") {
      if (!canComplete) {
        message.error(getPaperVoucherQrUnknownStateMessage(orderId));
        return;
      }
      try {
        await updateOrder.mutateAsync({
          id: orderId,
          dto: {
            orderStatusId: OrderStatus.COMPLETED,
            shippingStatusId: paidQr.shippingStatusId,
            paymentStatusId: paidQr.paymentStatusId,
            planScreenId
          }
        });
      } catch (error: unknown) {
        const code = getApiErrorCode(error);
        if (code === PAPER_VOUCHER_QR_ERROR_CODES.qrPaymentNotConfirmed) {
          // Backend không xác nhận đủ số tiền còn lại: đơn còn chờ, voucher vẫn giữ.
          showPaperVoucherQrReconciliation(
            orderId,
            getPaperVoucherQrShortPaymentMessage(orderId, orderDetail)
          );
          return;
        }
        if (code === PAPER_VOUCHER_QR_ERROR_CODES.orderLocked) {
          // Đơn vừa rời trạng thái chờ (job khôi phục / IPN / đóng QR): đọc lại, không gửi lại.
          await settlePaperVoucherQr(paidQr, { waitingMessage, canComplete: false });
          return;
        }
        message.error(
          isRetryableApiError(error)
            ? getPaperVoucherQrUnknownStateMessage(orderId)
            : getApiErrorMessage(error, "Chuyển đơn sang thành công thất bại")
        );
        return;
      }
      // `PUT status` không trả trạng thái đơn: đọc lại, chỉ báo thành công khi voucher đã APPLIED.
      await settlePaperVoucherQr(paidQr, { waitingMessage, canComplete: false });
      return;
    }
    if (state === "waiting") {
      message.warning(waitingMessage);
      return;
    }

    // Đơn đã kết thúc/hủy (ở máy khác, job hết hạn, hủy đơn): không in vé.
    const closedMessage = getPaperVoucherQrClosedMessage(orderId, state, orderDetail);
    finishPaperVoucherQr();
    void refreshAfterPaperVoucherQrClosed(orderId, { vouchers: true });
    if (needsPaperVoucherQrReconciliation(orderDetail)) {
      showPaperVoucherQrReconciliation(orderId, closedMessage);
      return;
    }
    message.error(closedMessage);
  };

  /**
   * N6: tạo QR cho đơn có voucher giấy (đơn đã tạo, voucher đang giữ). Lỗi tạm thời (409 đang tạo, 503,
   * mất mạng/timeout) tự thử lại có giới hạn, tuần tự, cùng đơn (backend dùng lại QR đã tạo). Không lỗi
   * nào tự kết thúc đơn hay trả voucher; hết lượt thì giữ màn QR chưa có mã để thu ngân quyết định.
   */
  const createPaperVoucherQr = (
    pendingQr: QrDialogData,
    qrRequest: CreateQrOrderDto,
    delays: readonly number[]
  ) =>
    runQrAction("create", async () => {
      const { orderId } = pendingQr;
      const isStillOpen = () => isMountedRef.current && isQrOpenFor(orderId);
      const result = await createPaperVoucherQrWithRetry(() => createQr.mutateAsync(qrRequest), {
        delays,
        shouldStop: () => !isStillOpen(),
        onRetry: (retry, failure) =>
          showPaperVoucherQrPending(
            pendingQr,
            `${failure.message} Đang tự tạo lại QR (lần ${retry}/${delays.length})...`
          )
      });
      if (!isStillOpen()) return;
      if (result.ok) {
        openQrWithCode(applyQrResponse(pendingQr, result.qr));
        return;
      }
      await onPaperVoucherQrCreateFailed(pendingQr, result.failure);
    });

  const onPaperVoucherQrCreateFailed = async (
    pendingQr: QrDialogData,
    failure: PaperVoucherQrCreateFailure
  ) => {
    showPaperVoucherQrPending(pendingQr, failure.message);
    if (isPaperVoucherQrCreateRetryable(failure)) {
      message.warning(failure.message);
      return;
    }
    // Backend đã trả lời: giao dịch QR đã thanh toán/đã đóng, hoặc từ chối tạo QR. Tra lại đơn.
    await settlePaperVoucherQr(pendingQr, { waitingMessage: failure.message });
  };

  const startPaperVoucherQr = (pendingQr: QrDialogData, qrRequest: CreateQrOrderDto) => {
    paperVoucherQrRequestRef.current = qrRequest;
    // Màn QR của đơn này bắt đầu từ đây: socket thanh toán của đơn được nhận ngay cả khi chưa có mã.
    qrDataRef.current = pendingQr;
    return createPaperVoucherQr(pendingQr, qrRequest, PAPER_VOUCHER_QR_RETRY_DELAYS_MS);
  };

  /** "Tạo lại QR" do thu ngân bấm: một lần gọi cho cùng đơn, không tạo đơn mới. */
  const onRetryPaperVoucherQr = () => {
    const pendingQr = qrDataRef.current;
    const qrRequest = paperVoucherQrRequestRef.current;
    if (!pendingQr?.paperVoucher || !qrRequest || qrRequest.orderId !== pendingQr.orderId) return;
    void createPaperVoucherQr(pendingQr, qrRequest, []);
  };

  const onCheckQrTransaction = () => {
    const checkingQr = qrDataRef.current ?? qrData;
    if (!checkingQr) return;

    return runQrAction("check", async () => {
      if (checkingQr.paperVoucher) {
        // `check-transaction` chỉ hỏi VietQR: đơn VNPayQR có voucher giấy đọc thẳng trạng thái đơn.
        if (canRecheckQrTransactionWithProvider(checkingQr.paymentMethodSystemName)) {
          try {
            await ordersApi.checkTransaction({ orderId: checkingQr.orderId });
          } catch {
            // N8: check-transaction 404/500/mất mạng không phải kết luận: vẫn đọc đơn từ backend.
          }
        }
        await settlePaperVoucherQr(checkingQr);
        return;
      }

      try {
        await ordersApi.checkTransaction({ orderId: checkingQr.orderId });

        const orderDetail = await queryClient.fetchQuery({
          queryKey: ordersKeys.getDetail(checkingQr.orderId),
          queryFn: () => ordersApi.getDetail(checkingQr.orderId)
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
          await handleQrPaymentSuccess(checkingQr);
          return;
        }

        message.warning("Giao dịch chưa được ghi nhận thành công. Vui lòng kiểm tra lại.");
      } catch {
        message.error("Kiểm tra lại giao dịch thanh toán thất bại");
      }
    });
  };

  /**
   * "Kết thúc" QR của đơn có voucher giấy: chờ backend trả voucher rồi mới đóng và tải lại sơ đồ ghế.
   * Nếu QR vừa được thanh toán (đơn đã hoàn tất / tiền đã nhận) thì tra lại trạng thái thay vì báo
   * thất bại; lỗi khác giữ màn QR để thu ngân kiểm tra lại, không coi đóng màn hình là kết thúc giao dịch.
   */
  const onClosePaperVoucherQr = (closingQr: QrDialogData) =>
    runQrAction("close", async () => {
      const { orderId } = closingQr;
      try {
        await updateOrder.mutateAsync({
          id: orderId,
          dto: {
            orderStatusId: OrderStatus.FAIL,
            shippingStatusId: closingQr.shippingStatusId,
            paymentStatusId: closingQr.paymentStatusId,
            planScreenId
          }
        });
      } catch (error: unknown) {
        const code = getApiErrorCode(error);
        const isPaidMeanwhile =
          code === PAPER_VOUCHER_QR_ERROR_CODES.qrPaymentReceived ||
          code === PAPER_VOUCHER_QR_ERROR_CODES.orderLocked;
        if (isPaidMeanwhile) {
          await settlePaperVoucherQr(closingQr);
          return;
        }
        if (!isQrOpenFor(orderId)) return;
        message.error(
          isRetryableApiError(error)
            ? PAPER_VOUCHER_QR_CLOSE_UNKNOWN_MESSAGE
            : getApiErrorMessage(error, PAPER_VOUCHER_QR_CLOSE_FAILED_MESSAGE)
        );
        return;
      }
      // Backend đã kết thúc đơn và trả voucher: đóng màn QR, tải lại ghế/đơn một lần.
      finishPaperVoucherQr();
      void refreshAfterPaperVoucherQrClosed(orderId);
      message.warning(getPaperVoucherQrClosedMessage(orderId, "released"));
    });

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
      ...buildCancelOrderTarget(cancelOrderSelection),
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
        if (!cancelOrderSelection || !isOrderCancelConflict(error)) {
          message.error(getApiErrorMessage(error, "Hủy vé thất bại"));
          return;
        }
        void onCancelConflict(cancelOrderSelection.orderId, error);
      }
    });
  };

  /**
   * O-8: đơn đã đổi trạng thái sau khi thu ngân bắt đầu hủy (vừa được thanh toán, đã nhận tiền QR, đã kết thúc):
   * backend không hủy gì. Không gửi lại; đóng hộp hủy, bỏ chọn, tải lại đơn rồi hướng dẫn theo trạng thái mới.
   * Muốn hủy tiếp thì thu ngân chọn lại đơn: một lệnh hủy mới, theo trạng thái mới.
   */
  const onCancelConflict = async (orderId: number, error: unknown) => {
    setOpenCancelSeats(false);
    form.resetFields();
    setSelectedSeats([]);
    onCancelOrderSelectionClear();
    queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreenId) });
    queryClient.invalidateQueries({ queryKey: ordersKeys.getOrdersByScreening(planScreenId) });
    queryClient.invalidateQueries({ queryKey: ordersKeys.getDetail(orderId) });
    const detail = await ordersApi.getDetail(orderId).catch(() => null);
    message.warning({
      content: getOrderCancelConflictMessage({
        orderId,
        order: detail?.order ?? null,
        fallback: getApiErrorMessage(error, "Hủy vé thất bại")
      }),
      duration: 8
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
    isReconcilingPaperVoucher ||
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
          {/* Phần voucher giấy của lần bán nằm trong tooltip để footer không cao thêm. */}
          <Tooltip
            title={
              lastSalePaperVoucher > 0 ? (
                <>
                  <p data-testid="last-sale-paper-voucher">
                    Voucher giấy: {formatMoney(lastSalePaperVoucher)}
                  </p>
                  <p data-testid="last-sale-collected">
                    Khách trả thêm: {formatMoney(lastSaleCollected)}
                  </p>
                </>
              ) : undefined
            }
          >
            <p
              data-testid="last-sale-total"
              className="flex items-center gap-1 whitespace-nowrap font-bold tabular-nums text-emerald-700 dark:text-amber-200 text-sm"
            >
              {formatMoney(lastSaleTotal)}
              {lastSalePaperVoucher > 0 && (
                <TicketPercent
                  size={14}
                  aria-label="Có thanh toán bằng voucher giấy"
                  className="text-orange-500 dark:text-orange-300"
                />
              )}
            </p>
          </Tooltip>
        </div>
        <div className="grid grid-flow-col grid-rows-2 gap-1.5">
          <Tooltip title={hasPaperVoucher ? PAPER_VOUCHER_RESERVE_BLOCKED_MESSAGE : undefined}>
            <Button
              variant="outlined"
              color="green"
              aria-busy={isSeatSelectionPending}
              disabled={
                disableNonCancelActions ||
                !canUpdate ||
                selectedSeats.length === 0 ||
                hasPaperVoucher
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
          {canCreate && !isPlanScreeningPast && (
            <Badge
              className="row-span-2"
              size="small"
              count={paperVoucherLines.reduce((total, line) => total + line.quantity, 0)}
            >
              <Button
                variant="outlined"
                color="orange"
                className="h-full! w-16 flex-col gap-0.5 px-1!"
                icon={<TicketPercent size={18} />}
                aria-busy={isSeatSelectionPending}
                disabled={disableNonCancelActions || selectedSeats.length === 0}
                onClick={() => setOpenPaperVoucherDialog(true)}
              >
                <span className="text-xs leading-tight whitespace-normal">Voucher giấy</span>
              </Button>
            </Badge>
          )}
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col">
            <Checkbox
              checked={vipCard}
              disabled={disableNonCancelActions || !canCreate}
              onChange={(e) => setVipCard(e.target.checked)}
            >
              Quẹt thẻ VIP
            </Checkbox>
            <Tooltip title={hasPaperVoucher ? PAPER_VOUCHER_PAYMENT_HINT : undefined}>
              <Checkbox.Group
                className="flex flex-col"
                value={paymentMethod}
                disabled={disableNonCancelActions || !canCreate}
                onChange={onChange}
                options={paymentOptions}
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
                  if (vipCard && !(hasPaperVoucher && vipSelection)) {
                    setOpenVipCardDialog(true);
                    return;
                  }

                  void onBooking();
                }}
                aria-busy={isSeatSelectionPending}
                disabled={
                  createOrder.isPending ||
                  isReconcilingPaperVoucher ||
                  isSeatSelectionPending ||
                  selectedSeats.length === 0 ||
                  createQr.isPending ||
                  // Mọi thao tác QR (tạo / kiểm tra lại / kết thúc) giữ khóa tới khi xong: socket có thể đã đóng
                  // màn QR trong lúc "Kiểm tra lại" còn chạy; bán tiếp lúc đó thì QR của đơn mới bị bỏ qua.
                  qrAction !== null ||
                  cancelMode ||
                  !canCreate ||
                  isPlanScreeningPast ||
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
            if (qrData.paperVoucher) {
              // Khóa thao tác QR nằm trong `onClosePaperVoucherQr` (ref): bấm liên tiếp chỉ gửi một lần.
              void onClosePaperVoucherQr(qrData);
              return;
            }
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
          isCheckingTransaction={qrAction === "check"}
          isClosing={qrAction === "close"}
          isRetryingQr={qrAction === "create"}
          qrUnavailableMessage={qrData.paperVoucher ? qrUnavailableMessage : undefined}
          onRetryCreateQr={qrData.paperVoucher ? onRetryPaperVoucherQr : undefined}
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
          draftQuote={{
            quote: paperVoucherQuote.quote,
            isLoading: paperVoucherQuote.isLoading,
            errorMessage: paperVoucherQuote.errorMessage,
            isReplaced: paperVoucherQuote.isReplaced,
            paymentMethodLabel: formatPaymentMethod(selectedPaymentMethod),
            onRetry: paperVoucherQuote.retry
          }}
          memberCardCode={vipSelection?.memberCardCode}
          clearDisabled={disableNonCancelActions}
          onDraftChange={setPaperVoucherDraft}
          onClear={() => {
            setPaperVoucherLines([]);
            setOpenPaperVoucherDialog(false);
          }}
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
