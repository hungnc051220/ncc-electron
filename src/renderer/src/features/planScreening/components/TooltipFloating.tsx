import { formatMoney } from "@renderer/lib/utils";
import { ListSeat, OrderResponseProps } from "@shared/types";
import dayjs from "dayjs";
import { useLayoutEffect, useRef, useState } from "react";

type TooltipPosition = {
  x: number;
  y: number;
};

interface TooltipFloatingProps {
  seat: ListSeat;
  order?: OrderResponseProps;
  position: TooltipPosition;
  visible: boolean;
}

const TooltipFloating = ({ seat, order, position, visible }: TooltipFloatingProps) => {
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

    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const itemMatchedSeat = order?.items?.find((item) => {
    const floorKey =
      seat.floor === 1
        ? "listChairIndexF1"
        : seat.floor === 2
          ? "listChairIndexF2"
          : "listChairIndexF3";
    const seatIndexes = (item[floorKey] ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    return seatIndexes.includes(seat.seat);
  });

  const actorName =
    findByKeys(order, ["createdBy", "userName", "userFullName", "createdUser"]) ?? "--";

  const inviterName =
    findByKeys(order, ["inviterName", "inviter", "createdBy", "userName", "createdUser"]) ?? "--";

  const printedBy =
    findByKeys(order, [
      "printingUserName",
      "printedBy",
      "printedByName",
      "printingUser",
      "printedUserName"
    ]) ?? "--";

  const ticketPrice = itemMatchedSeat?.unitPriceInclTax ?? seat.price ?? 0;
  const seatInfo = seat.positionName?.trim() || labelSeatByType[seat.type] || "Ghế";

  const isInvitationTicket = seat.isInvitation === 1;
  const isHoldSeat = seat.isHold === 1;
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
      {!order || (!isInvitationTicket && !isHoldSeat && !isSoldSeat) ? (
        <>
          <p className="font-semibold">{seatInfo}</p>
          <p>Giá: {formatMoney(seat.price || 0)}</p>
        </>
      ) : isInvitationTicket ? (
        <>
          <p className="font-semibold mb-1 text-sm">Vé mời</p>
          <p>Người mời: {inviterName}</p>
          <p>Thời gian: {formatDateTime(order.createdOnUtc)}</p>
          <div className="my-2 border border-dashed" />
          <p>{seatInfo}</p>
          <p>Giá ghế: {formatMoney(ticketPrice)}</p>
        </>
      ) : (
        <>
          <p className="font-semibold mb-1 text-sm">{isHoldSeat ? "Ghế giữ chỗ" : "Vé đã bán"}</p>
          <p>Người thực hiện: {actorName}</p>
          <p>Thời gian thực hiện: {formatDateTime(order.createdOnUtc)}</p>
          <p>Người xuất vé: {printedBy}</p>
          <p>Thời gian xuất vé: {formatDateTime(order.printedOnUtc)}</p>
          <div className="my-2 border border-dashed" />
          <p>{seatInfo}</p>
          <p>Giá vé: {formatMoney(ticketPrice)}</p>
        </>
      )}
    </div>
  );
};

export default TooltipFloating;
