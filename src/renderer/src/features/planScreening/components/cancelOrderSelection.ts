import { resolveOrderPaymentStatus } from "@renderer/lib/utils";
import { ListSeat, OrderResponseProps, OrderStatus, PaymentStatus } from "@shared/types";

export type CancelOrderSelection = {
  orderId: number;
  directSeatKey: string;
  seats: ListSeat[];
  seatKeys: string[];
  isComplete: boolean;
};

export const getSeatUniqueKey = (seat: ListSeat) => `${seat.floor}-${seat.seat}`;

const normalizeChair = (value?: string) => value?.trim().toUpperCase() || "";

const splitChairs = (value?: string) =>
  (value || "").split(",").map(normalizeChair).filter(Boolean);

export const isOrderCancellable = (order: OrderResponseProps) => {
  const paymentStatus = resolveOrderPaymentStatus(order);

  return (
    !order.deleted &&
    order.orderStatusId !== OrderStatus.FAIL &&
    order.orderStatusId !== OrderStatus.CANCELLED &&
    paymentStatus !== PaymentStatus.FAIL &&
    paymentStatus !== PaymentStatus.VOIDED
  );
};

const getOrderItemsForScreening = (order: OrderResponseProps, planScreeningId?: number) =>
  (order.items || []).filter((item) => !planScreeningId || item.planScreenId === planScreeningId);

export const buildSeatOrderMap = (
  orders: OrderResponseProps[] | undefined,
  planScreeningId?: number
) => {
  const map: Record<string, OrderResponseProps> = {};

  (orders || []).forEach((order) => {
    getOrderItemsForScreening(order, planScreeningId).forEach((item) => {
      [1, 2, 3].forEach((floor) => {
        const indexKey = `listChairIndexF${floor}` as const;
        const valueKey = `listChairValueF${floor}` as const;

        [
          ...splitChairs(item[indexKey]).map((chair) => `${floor}-${chair}`),
          ...splitChairs(item[valueKey]).map((chair) => `${floor}-code:${chair}`)
        ].forEach((seatKey) => {
          const current = map[seatKey];
          if (!current || new Date(order.createdOnUtc) > new Date(current.createdOnUtc)) {
            map[seatKey] = order;
          }
        });
      });
    });
  });

  return map;
};

export const findSeatOrder = (seat: ListSeat, seatOrderMap: Record<string, OrderResponseProps>) =>
  seatOrderMap[getSeatUniqueKey(seat)] ||
  seatOrderMap[`${seat.floor}-code:${normalizeChair(seat.code)}`];

export const buildCancelOrderSelection = ({
  order,
  seats,
  planScreeningId,
  directSeatKey
}: {
  order: OrderResponseProps;
  seats: ListSeat[];
  planScreeningId: number;
  directSeatKey: string;
}): CancelOrderSelection => {
  const seatByIndex = new Map(
    seats.map((seat) => [`${seat.floor}-${normalizeChair(seat.seat)}`, seat])
  );
  const seatByCode = new Map(
    seats.map((seat) => [`${seat.floor}-${normalizeChair(seat.code)}`, seat])
  );
  const selectedSeatMap = new Map<string, ListSeat>();
  let expectedSeatCount = 0;
  let missingSeatCount = 0;

  getOrderItemsForScreening(order, planScreeningId).forEach((item) => {
    [1, 2, 3].forEach((floor) => {
      const indexKey = `listChairIndexF${floor}` as const;
      const valueKey = `listChairValueF${floor}` as const;
      const indices = splitChairs(item[indexKey]);
      const values = splitChairs(item[valueKey]);
      const chairCount = Math.max(indices.length, values.length);

      for (let index = 0; index < chairCount; index += 1) {
        expectedSeatCount += 1;
        const seat =
          (indices[index] ? seatByIndex.get(`${floor}-${indices[index]}`) : undefined) ||
          (values[index] ? seatByCode.get(`${floor}-${values[index]}`) : undefined);

        if (!seat) {
          missingSeatCount += 1;
          continue;
        }

        selectedSeatMap.set(getSeatUniqueKey(seat), seat);
      }
    });
  });

  const selectedSeats = sortSeats(Array.from(selectedSeatMap.values()));

  return {
    orderId: order.id,
    directSeatKey,
    seats: selectedSeats,
    seatKeys: selectedSeats.map(getSeatUniqueKey),
    isComplete:
      expectedSeatCount > 0 && missingSeatCount === 0 && selectedSeats.length === expectedSeatCount
  };
};

export const sortSeats = (seats: ListSeat[]) =>
  [...seats].sort(
    (left, right) =>
      left.floor - right.floor ||
      left.rows - right.rows ||
      left.column - right.column ||
      left.code.localeCompare(right.code, "vi", { numeric: true })
  );

export const formatCancelSeatList = (seats: ListSeat[]) =>
  sortSeats(seats)
    .map((seat) => (seat.floor > 1 ? `T${seat.floor}-${seat.code}` : seat.code))
    .join(", ");
