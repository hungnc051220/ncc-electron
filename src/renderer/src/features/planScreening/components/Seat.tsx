import { cn } from "@renderer/lib/utils";
import { ListSeat } from "@renderer/types";
import { useCallback } from "react";

const colorMap: { [key: string]: string } = {
  0: "bg-jiren text-trunks",
  1: "bg-krillin text-white",
  2: "bg-chichi text-white",
  12: "bg-transparent"
};

const Seat = ({
  seat,
  isSelected,
  onSelect,
  size
}: {
  seat: ListSeat;
  isSelected: boolean;
  onSelect: (seat: ListSeat) => void;
  size: number;
}) => {
  const canSelect = seat.type !== 12 && seat.status !== 1;

  const handleClick = useCallback(() => {
    if (canSelect) {
      onSelect(seat);
    }
  }, [canSelect, onSelect, seat]);

  return (
    <div
      className={cn(
        "relative rounded-sm flex items-center justify-center selectable-seat",
        colorMap[seat.type],
        canSelect && "cursor-pointer",
        isSelected && "bg-whis text-white",
        seat.isContract && "bg-raditz text-white",
        seat.isHold && "bg-roshi text-white",
        seat.status === 1 && "bg-trunks text-white cursor-not-allowed"
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`
      }}
      onClick={handleClick}
      data-seat-code={seat.code}
      data-seat-floor={seat.floor}
      data-seat-unique-key={`${seat.floor}-${seat.code}`}
    >
      <p className="text-xs" style={{ fontSize: `${Math.max(10, size * 0.25)}px` }}>
        {seat.type !== 12 ? seat.code : ""}
      </p>
    </div>
  );
};

export default Seat;
