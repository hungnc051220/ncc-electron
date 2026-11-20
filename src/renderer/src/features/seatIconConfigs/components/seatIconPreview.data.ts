import type { ListSeat } from "@shared/types";

/**
 * Sơ đồ mẫu cho phần xem trước (không phải dữ liệu thật): đủ mọi trạng thái để thấy ảnh chỉ thay ghế
 * đã bán thông thường (thường/VIP/đôi), còn đang chọn, giữ chỗ, chờ thanh toán, hợp đồng, vé mời giữ nguyên.
 */

export const PREVIEW_SEAT_TYPES = [
  { id: 1, name: "Ghế thường", color: "#8f8f8f" },
  { id: 2, name: "Ghế VIP", color: "#f5c542" },
  { id: 3, name: "Ghế đôi", color: "#ff7aa2" }
] as const;

export const PREVIEW_SEAT_TYPE_COLOR = new Map<number, string>(
  PREVIEW_SEAT_TYPES.map((type) => [type.id, type.color])
);

type SeatPatch = Partial<Pick<ListSeat, "status" | "isHold" | "isContract" | "isInvitation">>;

const SEAT_STATES: Record<string, SeatPatch> = {
  A3: { status: 1 },
  A9: { isHold: 1 },
  A10: { isHold: 1 },
  B5: { status: 1 },
  B6: { status: 1 },
  B7: { status: 1 },
  B8: { status: 1 },
  C3: { isContract: 1 },
  C4: { isContract: 1 },
  C9: { status: 1 },
  C10: { status: 1 },
  D5: { status: 1 },
  D6: { status: 1 },
  D7: { status: 1 },
  D8: { status: 1 },
  E7: { isInvitation: 1 },
  E8: { status: 1 },
  E9: { status: 1 },
  E10: { status: 1 },
  H3: { status: 1 },
  H4: { status: 1 }
};

/** Ghế "Đang chọn", "Chờ thanh toán" (prop của `Seat`, không phải trường của `ListSeat`). */
export const PREVIEW_SELECTED_SEAT_CODES = new Set(["F5", "F6"]);
export const PREVIEW_PENDING_PAYMENT_SEAT_CODES = new Set(["B11"]);

const ROW_LETTERS = ["A", "B", "C", "D", "E", "F", "H"];
const FIRST_SEAT_NUMBER = 3;
const SEATS_PER_ROW = 9;

const positionOfRow = (letter: string) => {
  if (["D", "E", "F"].includes(letter)) return { positionId: 2, positionName: "Ghế VIP", type: 1 };
  if (letter === "H") return { positionId: 3, positionName: "Ghế đôi", type: 2 };
  return { positionId: 1, positionName: "Ghế thường", type: 0 };
};

const buildRow = (letter: string, rowIndex: number): ListSeat[] =>
  Array.from({ length: SEATS_PER_ROW }, (_, columnIndex) => {
    const code = `${letter}${FIRST_SEAT_NUMBER + columnIndex}`;
    const position = positionOfRow(letter);
    return {
      seat: `${rowIndex + 1}-${columnIndex + 1}`,
      rows: rowIndex + 1,
      column: columnIndex + 1,
      y: rowIndex + 1,
      code,
      type: position.type,
      status: 0,
      floor: 1,
      price: 0,
      checkinStatus: 0,
      isInvitation: 0,
      isContract: 0,
      isHold: 0,
      positionId: position.positionId,
      positionName: position.positionName,
      ...(SEAT_STATES[code] ?? {})
    };
  });

export const PREVIEW_SEAT_ROWS: ListSeat[][] = ROW_LETTERS.map(buildRow);

/** Ghế đã bán thông thường mẫu cho ô xem trước nhỏ (bảng danh sách, kiểm tra hiệu lực). */
export const SAMPLE_SOLD_SEAT: ListSeat = {
  seat: "sample",
  rows: 1,
  column: 1,
  y: 1,
  code: "A7",
  type: 0,
  status: 1,
  floor: 1,
  price: 0,
  checkinStatus: 0,
  isInvitation: 0,
  isContract: 0,
  isHold: 0,
  positionName: "Ghế thường"
};
