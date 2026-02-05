import Selecto from "react-selecto";
import { Tabs } from "antd";
import Seats from "./seats";
import { useMemo, useState } from "react";
import { SeatProps } from "@/types";

type SelectedSeat = {
  id: string; // floor-1-D12
  code: string; // D12
  floor: number;
};

type FloorSeats = {
  floor: number;
  rows: SeatProps[][];
};

function groupByFloor(data: SeatProps[][]): FloorSeats[] {
  const map = new Map<number, SeatProps[][]>();

  data.forEach((row) => {
    const floor = row[0]?.floor;
    if (!map.has(floor)) map.set(floor, []);
    map.get(floor)!.push(row);
  });

  return Array.from(map.entries()).map(([floor, rows]) => ({
    floor,
    rows,
  }));
}

export function SeatTabs({ data }: { data: SeatProps[][] }) {
  const floors = groupByFloor(data);

  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);

  const selectedSeatIds = useMemo(
    () => new Set(selectedSeats.map((s) => s.id)),
    [selectedSeats],
  );

  return (
    <div className="flex flex-1 flex-col min-h-0 relative">
      <Selecto
        dragContainer=".seat-select-container"
        selectableTargets={["[data-seat]:not([disabled])"]}
        selectByClick
        selectFromInside
        toggleContinueSelect={["shift", "ctrl"]}
        hitRate={0}
        onSelectEnd={(e) => {
          const next = e.selected.map((el) => ({
            id: el.getAttribute("data-seat-id")!,
            code: el.textContent!,
            floor: Number(el.getAttribute("data-floor")),
          }));

          setSelectedSeats((prev) => {
            const map = new Map(prev.map((s) => [s.id, s]));
            next.forEach((s) => map.set(s.id, s));
            return Array.from(map.values());
          });
        }}
      />

      <div className="seat-select-container flex-1 min-h-0">
        <Tabs
          className="h-full"
          items={floors.map((f) => ({
            key: String(f.floor),
            label: `Tầng ${f.floor}`,
            children: (
              <div className="h-full">
                <Seats rows={f.rows} selectedSeatIds={selectedSeatIds} />
              </div>
            ),
          }))}
        />
      </div>
    </div>
  );
}
