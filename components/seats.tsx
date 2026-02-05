"use client";

import { SeatProps } from "@/types";
import SeatItem from "./seat-item";

type SeatsProps = {
  rows: SeatProps[][];
  selectedSeatIds: Set<string>;
};

const Seats = ({ rows, selectedSeatIds }: SeatsProps) => {
  const rowCount = rows.length;
  const colCount = Math.max(...rows.map((r) => r.length));

  const seatSize = `min(
    calc((100vh - 220px) / ${rowCount}),
    calc(100vw / ${colCount})
  )`;

  return (
    <div className="flex h-full items-center justify-center">
      <div
        className="grid gap-2"
        style={{
          gridTemplateRows: `repeat(${rowCount}, ${seatSize})`,
          gridTemplateColumns: `repeat(${colCount}, ${seatSize})`,
        }}
      >
        {rows.flat().map((seat) => {
          const id = `floor-${seat.floor}-${seat.code}`;
          return (
            <SeatItem key={id} seat={seat} selected={selectedSeatIds.has(id)} />
          );
        })}
      </div>
    </div>
  );
}

export default Seats