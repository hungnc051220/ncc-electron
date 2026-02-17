import { useMemo } from "react";
import { formatMoney } from "@renderer/lib/utils";
import { ListSeat } from "@renderer/types";

type TooltipPosition = {
  x: number;
  y: number;
};

interface TooltipFloatingProps {
  seat: ListSeat;
  position: TooltipPosition;
  visible: boolean;
}

const TooltipFloating = ({ seat, position, visible }: TooltipFloatingProps) => {
  const style = useMemo(() => {
    const offset = 16;
    const tooltipWidth = 160;
    const tooltipHeight = 60;

    let left = position.x + offset;
    let top = position.y + offset;

    // Flip nếu sát mép phải
    if (left + tooltipWidth > window.innerWidth) {
      left = position.x - tooltipWidth - offset;
    }

    // Flip nếu sát mép dưới
    if (top + tooltipHeight > window.innerHeight) {
      top = position.y - tooltipHeight - offset;
    }

    return {
      left,
      top
    };
  }, [position]);

  const labelSeat = {
    0: "Ghế thường",
    1: "Ghế VIP",
    2: "Ghế đôi"
  };

  return (
    <div
      className={`
        fixed z-9999
        bg-black text-white text-xs 
        px-3 py-2 rounded-md shadow-lg
        transition-all duration-200 ease-out
        pointer-events-none
        ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"}
      `}
      style={style}
    >
      <p className="font-semibold">{labelSeat[seat.type]}</p>
      <p>Giá: {formatMoney(seat.price || 0)}</p>
    </div>
  );
};

export default TooltipFloating;
