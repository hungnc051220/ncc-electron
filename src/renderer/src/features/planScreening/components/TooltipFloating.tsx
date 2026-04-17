import { formatMoney, formatPaymentMethod } from "@renderer/lib/utils";
import {
  ListSeat,
  OrderResponseProps,
  OrderStatus,
  PaymentStatus,
  SellerProps
} from "@shared/types";
import dayjs from "dayjs";
import { useLayoutEffect, useRef, useState } from "react";

type TooltipPosition = {
  x: number;
  y: number;
};

interface TooltipFloatingProps {
  seat: ListSeat;
  order?: OrderResponseProps;
  currentPlanScreeningId?: number;
  position: TooltipPosition;
  visible: boolean;
  isPendingPayment?: boolean;
}

const TooltipFloating = ({
  seat,
  order,
  currentPlanScreeningId,
  position,
  visible,
  isPendingPayment
}: TooltipFloatingProps) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ left: number; top: number }>({
    left: position.x + 16,
    top: position.y + 16
  });

  useLayoutEffect(() => {
    if (!visible) return;

    const offset = 16;
    const edgePadding = 8;
    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl?.offsetWidth || 320;
    const tooltipHeight = tooltipEl?.offsetHeight || 220;

    let left = position.x + offset;
    let top = position.y + offset;

    if (left + tooltipWidth > window.innerWidth - edgePadding) {
      left = position.x - tooltipWidth - offset;
    }

    if (top + tooltipHeight > window.innerHeight - edgePadding) {
      top = position.y - tooltipHeight - offset;
    }

    left = Math.max(edgePadding, Math.min(left, window.innerWidth - tooltipWidth - edgePadding));
    top = Math.max(edgePadding, Math.min(top, window.innerHeight - tooltipHeight - edgePadding));

    setStyle({ left, top });
  }, [position, visible, order, seat]);

  const labelSeatByType = {
    0: "Ghế thường",
    1: "Ghế VIP",
    2: "Ghế đôi"
  };

  const findByKeys = (source: unknown, keys: string[]) => {
    if (!source || typeof source !== "object") return undefined;
    const record = source as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return undefined;
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "--";
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format("HH:mm DD/MM/YYYY") : "--";
  };

  const formatTransactionType = (isOnline?: boolean) => {
    if (typeof isOnline !== "boolean") return "--";
    return isOnline ? "Online" : "Offline";
  };

  const getActorDisplayName = (person?: SellerProps) => {
    if (!person) return undefined;

    const fullName = [person.customerFirstName, person.customerLastName]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(" ");

    return fullName || person.username?.trim() || undefined;
  };

  const itemMatchedSeat = order?.items?.find((item) => {
    if (currentPlanScreeningId && item.planScreenId !== currentPlanScreeningId) {
      return false;
    }

    const floorKey =
      seat.floor === 1
        ? "listChairIndexF1"
        : seat.floor === 2
          ? "listChairIndexF2"
          : "listChairIndexF3";
    const seatValueKey =
      seat.floor === 1
        ? "listChairValueF1"
        : seat.floor === 2
          ? "listChairValueF2"
          : "listChairValueF3";
    const seatIndexes = (item[floorKey] ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const seatValues = (item[seatValueKey] ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    return seatIndexes.includes(seat.seat) || seatValues.includes(seat.code);
  });

  const actorName =
    getActorDisplayName(order?.seller) ??
    findByKeys(order, ["createdBy", "userName", "userFullName", "createdUser"]) ??
    "--";

  const inviterName =
    getActorDisplayName(order?.seller) ??
    findByKeys(order, ["inviterName", "inviter", "createdBy", "userName", "createdUser"]) ??
    "--";

  const printedBy =
    getActorDisplayName(order?.printer) ??
    findByKeys(order, [
      "printingUserName",
      "printedBy",
      "printedByName",
      "printingUser",
      "printedUserName"
    ]) ??
    "--";

  const ticketPrice = itemMatchedSeat?.unitPriceInclTax ?? seat.price ?? 0;
  const seatInfo = seat.positionName?.trim() || labelSeatByType[seat.type] || "Ghế";

  const totalSoldTickets =
    order?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || (itemMatchedSeat ? 1 : 0);
  const matchedItemQuantity = itemMatchedSeat?.quantity || 1;
  const perSeatItemDiscount = itemMatchedSeat
    ? (itemMatchedSeat.discountAmountInclTax || 0) / matchedItemQuantity
    : 0;
  const perSeatOrderDiscountFallback =
    !perSeatItemDiscount && totalSoldTickets > 0
      ? (order?.orderDiscount || 0) / totalSoldTickets
      : 0;
  const promotionAmount = perSeatItemDiscount || perSeatOrderDiscountFallback;
  const originalPrice = ticketPrice + promotionAmount;
  const finalAmount = Math.max(ticketPrice, 0);
  const isU22Voucher = order?.voucherCode === "U22Ticket";
  const promotionName =
    itemMatchedSeat?.discount?.discountName?.trim() ||
    (isU22Voucher
      ? "Khuyến mãi giá vé dành cho thành viên U22"
      : order?.campaign?.name?.trim() || order?.voucherCode?.trim() || "");
  const displayPromotionAmount =
    isU22Voucher && !itemMatchedSeat?.discount?.id ? 0 : promotionAmount;

  const isInvitationTicket = seat.isInvitation === 1;
  const isContractTicket = seat.isContract === 1;
  const isPendingPaymentSeat =
    isPendingPayment ||
    (order?.orderStatusId === OrderStatus.PENDING &&
      order?.paymentStatusId === PaymentStatus.PENDING);
  const isHoldSeat = seat.isHold === 1 || isPendingPaymentSeat;
  const isSoldSeat = seat.status === 1;

  return (
    <div
      ref={tooltipRef}
      className={`
        fixed z-9999
        bg-black text-white text-xs 
        px-3 py-2 rounded-md shadow-lg
        pointer-events-none
        max-w-[320px]
        ${visible ? "opacity-100" : "opacity-0"}
      `}
      style={style}
    >
      {!order || (!isInvitationTicket && !isContractTicket && !isHoldSeat && !isSoldSeat) ? (
        <>
          <p className="font-semibold">{seatInfo}</p>
          <p>Giá: {formatMoney(seat.price || 0)}</p>
        </>
      ) : isInvitationTicket ? (
        <>
          <p className="font-semibold mb-1 text-sm">Vé mời</p>
          <p>Người mời: {inviterName}</p>
          <p>Thời gian tạo: {formatDateTime(order.createdOnUtc)}</p>
          <p>Thời gian xuất vé: {formatDateTime(order.invitationTickets?.createdAt)}</p>
          <div className="my-2 border border-dashed" />
          <p>{seatInfo}</p>
          <p>Giá gốc: {formatMoney(0)}</p>
        </>
      ) : isContractTicket ? (
        <>
          <p className="font-semibold mb-1 text-sm">Vé hợp đồng</p>
          <p>Người thực hiện: {actorName}</p>
          <p>Thời gian tạo: {formatDateTime(order.createdOnUtc)}</p>
          <p>Người xuất vé: {printedBy}</p>
          <p>Thời gian xuất vé: {formatDateTime(order.printedOnUtc)}</p>
          <div className="my-2 border border-dashed" />
          <p>{seatInfo}</p>
          <p>Giá gốc: {formatMoney(0)}</p>
        </>
      ) : (
        <>
          <p className="font-semibold mb-1 text-sm">
            {isPendingPaymentSeat
              ? "Vé đang chờ thanh toán"
              : isHoldSeat
                ? "Ghế giữ chỗ"
                : "Vé đã bán"}
          </p>
          <p>Người thực hiện: {actorName}</p>
          <p>Thời gian thực hiện: {formatDateTime(order.createdOnUtc)}</p>
          <p>Người xuất vé: {printedBy}</p>
          <p>Thời gian xuất vé: {formatDateTime(order.printedOnUtc)}</p>
          <div className="my-2 border border-dashed" />
          <p>{seatInfo}</p>
          <p>Kênh thanh toán: {formatPaymentMethod(order.paymentMethodSystemName)}</p>
          <p>Loại giao dịch: {formatTransactionType(order.isOnline)}</p>
          {promotionName && <p>Chương trình khuyến mãi: {promotionName}</p>}
          <p>Giá gốc: {formatMoney(originalPrice)}</p>
          {displayPromotionAmount > 0 && (
            <p>Tiền khuyến mãi: {formatMoney(displayPromotionAmount)}</p>
          )}
          <p>Thành tiền: {formatMoney(finalAmount)}</p>
        </>
      )}
    </div>
  );
};

export default TooltipFloating;
