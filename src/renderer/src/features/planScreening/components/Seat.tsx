import { cn } from "@renderer/lib/utils";
import { ListSeat } from "@shared/types";
import { memo, useCallback } from "react";

const colorMap: { [key: string]: string } = {
  0: "bg-jiren text-trunks",
  1: "bg-krillin text-white",
  2: "bg-chichi text-white",
  12: "bg-transparent"
};

const getContrastTextColor = (backgroundColor: string) => {
  const normalized = backgroundColor.trim().toLowerCase();
  if (!normalized || normalized === "transparent") {
    return "#374151";
  }

  // Explicit light seat colors from business data
  if (normalized === "#ffffff" || normalized === "#ffff00" || normalized === "#ffd700") {
    return "#111827";
  }

  let r = 0;
  let g = 0;
  let b = 0;

  const parseRgbText = (value: string) => {
    const parts = value.match(/\d+(\.\d+)?/g);
    if (!parts || parts.length < 3) return null;
    return {
      r: Number(parts[0]),
      g: Number(parts[1]),
      b: Number(parts[2])
    };
  };

  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length >= 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
  } else if (normalized.startsWith("rgb")) {
    const rgb = parseRgbText(normalized);
    if (rgb) {
      r = rgb.r;
      g = rgb.g;
      b = rgb.b;
    }
  } else if (typeof window !== "undefined" && typeof document !== "undefined") {
    // Resolve CSS keywords / hsl / named colors (white, gold, yellow...) to rgb.
    const temp = document.createElement("span");
    temp.style.color = normalized;
    temp.style.position = "absolute";
    temp.style.visibility = "hidden";
    temp.style.pointerEvents = "none";
    document.body.appendChild(temp);
    const computed = window.getComputedStyle(temp).color;
    document.body.removeChild(temp);
    const rgb = parseRgbText(computed);
    if (rgb) {
      r = rgb.r;
      g = rgb.g;
      b = rgb.b;
    }
  }

  // Perceived luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance >= 0.6 ? "#111827" : "#ffffff";
};

const Seat = ({
  seat,
  isSelected,
  onSelect,
  size,
  canSelect,
  isPendingPayment,
  isBlockedOnline,
  isSelectingByOther,
  seatColor,
  seatUniqueKey,
  isDimmed,
  isSpotlighted,
  onHover,
  onLeave
}: {
  seat: ListSeat;
  isSelected: boolean;
  onSelect: (seat: ListSeat) => void;
  size: number;
  canSelect: boolean;
  isPendingPayment?: boolean;
  isBlockedOnline?: boolean;
  isSelectingByOther?: boolean;
  seatColor?: string;
  seatUniqueKey?: string;
  isDimmed?: boolean;
  isSpotlighted?: boolean;
  onHover?: (seat: ListSeat, e: React.MouseEvent<HTMLDivElement>) => void;
  onLeave?: () => void;
}) => {
  const handleClick = useCallback(() => {
    if (canSelect && !isSelectingByOther) {
      onSelect(seat);
    }
  }, [canSelect, isSelectingByOther, onSelect, seat]);

  const shouldShowPositionColor =
    !!seatColor &&
    !isSelected &&
    !seat.isHold &&
    !isPendingPayment &&
    !seat.isContract &&
    !seat.isInvitation &&
    !isBlockedOnline &&
    seat.status !== 1 &&
    seat.type !== 12;

  return (
    <div
      className={cn(
        "relative rounded-sm flex items-center justify-center",
        canSelect && !isSelectingByOther && "selectable-seat",
        colorMap[seat.type],
        canSelect && "cursor-pointer",
        isBlockedOnline && "bg-trunks/50",
        seat.status === 1 && !isPendingPayment && "bg-trunks text-white",
        seat.isContract && "bg-raditz text-white",
        (seat.isHold || isPendingPayment) && "bg-roshi text-white",
        seat.isInvitation && "bg-teal-500 text-white",
        !canSelect && "cursor-not-allowed",
        isSelected && "bg-whis text-white",
        isSelectingByOther && !isSelected && "ring-1 ring-primary/70",
        isDimmed && "opacity-30 saturate-50",
        isSpotlighted && "ring-2 ring-white/90 shadow-[0_0_0_2px_rgba(59,130,246,0.55)] z-10",
        isSpotlighted && !isSelected && "opacity-100 saturate-100"
      )}
      style={{
        backgroundColor: shouldShowPositionColor ? seatColor : undefined,
        color: shouldShowPositionColor ? getContrastTextColor(seatColor) : undefined,
        width: `${size}px`,
        height: `${size}px`
      }}
      onClick={handleClick}
      data-seat-code={seat.code}
      data-seat-floor={seat.floor}
      data-seat-unique-key={seatUniqueKey ?? `${seat.floor}-${seat.seat}`}
      onMouseEnter={(e) => onHover?.(seat, e)}
      onMouseLeave={onLeave}
    >
      <p
        className={cn("text-xs", isSelectingByOther && !isSelected && "font-bold underline")}
        style={{ fontSize: `${Math.max(10, size * 0.25)}px` }}
      >
        {seat.type !== 12 ? seat.code : ""}
      </p>
    </div>
  );
};

const MemoizedSeat = memo(Seat);

MemoizedSeat.displayName = "Seat";

export default MemoizedSeat;
