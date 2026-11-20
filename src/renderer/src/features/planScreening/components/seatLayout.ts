/** Khoảng cách ô ghế theo CSS thật của sơ đồ (dùng chung `Seats` và xem trước cấu hình icon ghế). */
export const SEAT_COLUMN_GAP = 4;
export const SEAT_ROW_GAP = 3;
export const MIN_SEAT_SIZE = 12;
export const MAX_SEAT_SIZE = 42;

/**
 * Cỡ ô ghế vừa vùng hiển thị: mỗi hàng gồm các ghế + 2 nhãn hàng, giới hạn 12–42 px cho màn hình POS,
 * giảm 1 px nếu làm tròn vẫn tràn chiều ngang.
 */
export const fitSeatSize = (
  usableWidth: number,
  usableHeight: number,
  maxRows: number,
  maxSeatsPerRow: number
): number => {
  const safety = 8; // buffer chống overflow
  const heightSeat = Math.floor((usableHeight - SEAT_ROW_GAP * (maxRows - 1) - safety) / maxRows);
  const totalItems = maxSeatsPerRow + 2;
  const widthSeat = Math.floor(
    (usableWidth - SEAT_COLUMN_GAP * (totalItems - 1) - safety) / totalItems
  );

  let size = Math.max(MIN_SEAT_SIZE, Math.min(heightSeat, widthSeat, MAX_SEAT_SIZE));
  const realGridWidth = size * totalItems + SEAT_COLUMN_GAP * (totalItems - 1);
  if (realGridWidth > usableWidth) size -= 1;

  return size;
};
