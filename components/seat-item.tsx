"use client";

import { cn } from "@/lib/utils";
import { SeatProps } from "@/types";

const colorMap: { [key: string]: string } = {
  0: "bg-jiren text-trunks",
  1: "bg-krillin text-white",
  2: "bg-chichi text-white",
  12: "bg-transparent",
};

type SeatItemProps = {
  seat: SeatProps;
  selected: boolean;
};

const SeatItem = ({ seat, selected }: SeatItemProps) => {
  const id = `floor-${seat.floor}-${seat.code}`;

  const canSelect = seat.type !== 12 && seat.status !== 1;

  return (
    <button
      data-seat
      data-seat-id={id}
      data-floor={seat.floor}
      disabled={seat.status === 1}
      // className={`
      //   flex items-center justify-center
      //   rounded-md text-[11px] font-medium
      //   select-none transition
      //   ${seat.type === 1 ? "bg-yellow-400 text-white" : "bg-indigo-100 text-indigo-700"}
      //   ${selected ? "ring-2 ring-indigo-500 bg-indigo-600 text-white" : ""}
      //   ${seat.status === 1 ? "bg-gray-500 text-white cursor-not-allowed" : "hover:scale-105"}
      // `}
      className={cn(
        "relative rounded-sm flex items-center justify-center",
        colorMap[seat.type],
        canSelect && "cursor-pointer",
        selected && "bg-whis text-white",
        seat.isContract && "bg-raditz text-white",
        seat.isHold && "bg-roshi text-white",
        seat.status === 1 && "bg-trunks text-white cursor-not-allowed",
      )}
    >
      {seat.code}
    </button>
  );
};

export default SeatItem;
