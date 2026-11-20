import Legend from "@renderer/components/Legend";
import Seat from "@renderer/features/planScreening/components/Seat";
import {
  fitSeatSize,
  MIN_SEAT_SIZE,
  SEAT_COLUMN_GAP
} from "@renderer/features/planScreening/components/seatLayout";
import { useSeatIconImage } from "@renderer/hooks/seatIconConfigs/useSeatIconImage";
import { cn } from "@renderer/lib/utils";
import type { ListSeat } from "@shared/types";
import { Segmented } from "antd";
import { useLayoutEffect, useRef, useState } from "react";
import {
  PREVIEW_PENDING_PAYMENT_SEAT_CODES,
  PREVIEW_SEAT_ROWS,
  PREVIEW_SEAT_TYPE_COLOR,
  PREVIEW_SEAT_TYPES,
  PREVIEW_SELECTED_SEAT_CODES,
  SAMPLE_SOLD_SEAT
} from "./seatIconPreview.data";

const noop = () => undefined;

/**
 * NCC đặt `colorBgLayout = #FFFFFF` (antd dùng làm nền rãnh Segmented): trả lại nền xám như
 * `films/components/Filter.tsx` để mục đang chọn nổi bật; cùng độ đậm chữ để bề rộng không đổi khi chuyển.
 */
export const SEGMENTED_CLASS = "bg-gray-200/80 font-medium dark:bg-black";

/** Ô ghế đã bán ở các cỡ thật của POS, trước và sau khi áp dụng ảnh (cùng component `Seat` của sơ đồ). */
export const SoldSeatSamples = ({ url }: { url?: string | null }) => {
  const status = useSeatIconImage(url);
  const activeUrl = status === "loaded" ? url : null;

  return (
    <div className="flex items-end gap-3">
      {[42, 28, 18].map((size) => (
        <div key={size} className="flex flex-col items-center gap-1">
          <div className="flex gap-1">
            <Seat
              seat={SAMPLE_SOLD_SEAT}
              isSelected={false}
              onSelect={noop}
              size={size}
              canSelect={false}
            />
            <Seat
              seat={SAMPLE_SOLD_SEAT}
              isSelected={false}
              onSelect={noop}
              size={size}
              canSelect={false}
              soldIconUrl={activeUrl}
            />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">{size}px</span>
        </div>
      ))}
    </div>
  );
};

/** Một ô ghế đã bán mẫu có ảnh (cột "Ảnh" của bảng). */
export const SoldSeatThumbnail = ({ url, size = 36 }: { url?: string | null; size?: number }) => {
  const status = useSeatIconImage(url);

  return (
    <Seat
      seat={SAMPLE_SOLD_SEAT}
      isSelected={false}
      onSelect={noop}
      size={size}
      canSelect={false}
      soldIconUrl={status === "loaded" ? url : null}
    />
  );
};

interface SeatMapPreviewProps {
  mode: "before" | "after";
  soldIconUrl?: string | null;
  rows?: ListSeat[][];
  showLegend?: boolean;
  className?: string;
}

/**
 * Sơ đồ ghế mẫu với cùng component `Seat`, khoảng cách và công thức tự co giãn như `Seats` (không có điều khiển
 * cỡ ô). Ảnh chỉ bật khi đã tải xong; ảnh lỗi ⇒ giao diện mặc định như sơ đồ thật.
 */
export const SeatMapPreview = ({
  mode,
  soldIconUrl,
  rows = PREVIEW_SEAT_ROWS,
  showLegend = true,
  className
}: SeatMapPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [seatSize, setSeatSize] = useState<number | null>(null);
  const loadState = useSeatIconImage(soldIconUrl);
  const activeIconUrl = mode === "after" && loadState === "loaded" ? soldIconUrl : null;
  const seatsPerRow = Math.max(...rows.map((row) => row.length));

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const update = () => {
      if (!element.clientWidth || !element.clientHeight) return;
      setSeatSize(fitSeatSize(element.clientWidth, element.clientHeight, rows.length, seatsPerRow));
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();

    return () => observer.disconnect();
  }, [rows.length, seatsPerRow]);

  const size = seatSize ?? MIN_SEAT_SIZE;

  const rowLabel = (row: ListSeat[]) => (
    <div
      className="text-trunks dark:text-white font-medium flex items-center justify-center"
      style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(12, size * 0.3)}px` }}
    >
      {row[0]?.code.charAt(0) ?? ""}
    </div>
  );

  return (
    <div className={cn("flex min-h-0 flex-col gap-1.5", className)}>
      <fieldset className="border-t-3 border-jiren w-2/3 mx-auto">
        <legend className="mx-auto px-3 text-xs text-trunks dark:text-gray-200 font-bold">
          Màn hình
        </legend>
      </fieldset>
      <div ref={containerRef} className="flex min-h-0 flex-1 items-center justify-center">
        <div
          className="space-y-1 flex flex-col items-center"
          style={{ visibility: seatSize ? "visible" : "hidden" }}
          data-testid="seat-icon-preview-map"
        >
          {rows.map((row, index) => (
            <div
              key={index}
              className="flex items-center justify-center seat-row"
              style={{ columnGap: `${SEAT_COLUMN_GAP}px`, height: `${size}px` }}
            >
              {rowLabel(row)}
              {row.map((seat) => (
                <Seat
                  key={seat.seat}
                  seat={seat}
                  isSelected={PREVIEW_SELECTED_SEAT_CODES.has(seat.code)}
                  onSelect={noop}
                  size={size}
                  canSelect={seat.status !== 1}
                  isPendingPayment={PREVIEW_PENDING_PAYMENT_SEAT_CODES.has(seat.code)}
                  seatColor={
                    seat.positionId ? PREVIEW_SEAT_TYPE_COLOR.get(seat.positionId) : undefined
                  }
                  seatUniqueKey={`${seat.floor}-${seat.seat}`}
                  soldIconUrl={activeIconUrl}
                />
              ))}
              {rowLabel(row)}
            </div>
          ))}
        </div>
      </div>
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 shrink-0">
          <Legend color="bg-whis" label="Đang chọn" />
          {activeIconUrl ? (
            <div className="flex items-center gap-2">
              <img
                src={activeIconUrl}
                alt=""
                aria-hidden="true"
                className="size-3 xl:size-4 rounded-sm object-cover bg-trunks dark:bg-gray-700"
              />
              <span className="font-bold text-zeno dark:text-gray-200 text-[11px] xl:text-xs">
                Ghế đã bán
              </span>
            </div>
          ) : (
            <Legend color="bg-trunks dark:bg-gray-800" label="Ghế đã bán" />
          )}
          {PREVIEW_SEAT_TYPES.map((type) => (
            <div key={type.id} className="flex items-center gap-2">
              <div
                className="size-3 xl:size-4 rounded-sm border border-app-border"
                style={{ backgroundColor: type.color }}
              />
              <span className="font-bold text-zeno dark:text-gray-200 text-[11px] xl:text-xs">
                {type.name}
              </span>
            </div>
          ))}
          <Legend color="bg-roshi" label="Đang giữ chỗ" />
          <Legend color="bg-raditz" label="Ghế hợp đồng" />
          <Legend color="bg-red-500" label="Ghế mời" />
        </div>
      )}
      {mode === "after" && soldIconUrl && loadState === "error" && (
        <p className="m-0 text-center text-xs text-red-500" role="alert">
          Ảnh không tải được → sơ đồ tự quay về giao diện hiện tại (màu + mã ghế).
        </p>
      )}
    </div>
  );
};

/** Khung xem trước bên phải modal thêm/sửa: chỉ sơ đồ ghế, chuyển "Sau khi áp dụng" / "Hiện tại". */
export const SeatIconPreviewPanel = ({ imageUrl }: { imageUrl?: string | null }) => {
  const [view, setView] = useState<"after" | "before">("after");

  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-app-border dark:bg-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="m-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
          Xem trước trên sơ đồ ghế
        </h4>
        <Segmented
          aria-label="Chế độ xem trước"
          tabIndex={-1}
          className={SEGMENTED_CLASS}
          value={view}
          onChange={(value) => setView(value as "after" | "before")}
          options={[
            { value: "after", label: "Sau khi áp dụng" },
            { value: "before", label: "Hiện tại" }
          ]}
        />
      </div>
      <div className="min-h-75 flex-1 overflow-hidden">
        <SeatMapPreview mode={view} soldIconUrl={imageUrl} className="h-full" />
      </div>
      <p className="m-0 text-xs text-slate-500 dark:text-slate-400">
        Chỉ ghế <b>đã bán</b> đổi sang ảnh. Ghế trống, đang chọn, đang giữ, chờ thanh toán, hợp
        đồng, vé mời và chế độ chọn ghế để hủy vé giữ nguyên giao diện. Mã ghế vẫn xem được khi rê
        chuột.
      </p>
    </section>
  );
};
