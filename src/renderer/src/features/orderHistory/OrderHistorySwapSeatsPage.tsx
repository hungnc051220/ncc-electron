import { useAntdApp } from "@renderer/hooks/useAntdApp";

import { ordersApi } from "@renderer/api/orders.api";
import { useOrderDetail } from "@renderer/hooks/orders/useOrderDetail";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { useOrdersByScreening } from "@renderer/hooks/orders/useOrdersByScreening";
import { useSwapSeats } from "@renderer/hooks/orders/useSwapSeats";
import { useUpdateOrder } from "@renderer/hooks/orders/useUpdateOrder";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import { usePlanScreeningDetail } from "@renderer/hooks/planScreenings/usePlanScreeningDetail";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { formatMoney, resolveOrderPaymentStatus } from "@renderer/lib/utils";
import { ListSeat, OrderStatus } from "@shared/types";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Spin } from "antd";
import { RotateCcw, TimerOff, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import Seats from "../planScreening/components/Seats";

const buildSeatFieldsByFloor = (selectedSeats: ListSeat[]) => {
  const floors = [1, 2, 3] as const;

  return floors.reduce<
    Record<
      | "newListChairIndexF1"
      | "newListChairIndexF2"
      | "newListChairIndexF3"
      | "newListChairValueF1"
      | "newListChairValueF2"
      | "newListChairValueF3",
      string
    >
  >(
    (acc, floor) => {
      const seatsByFloor = selectedSeats.filter((seat) => seat.floor === floor);
      const indexKey = `newListChairIndexF${floor}` as
        | "newListChairIndexF1"
        | "newListChairIndexF2"
        | "newListChairIndexF3";
      const valueKey = `newListChairValueF${floor}` as
        | "newListChairValueF1"
        | "newListChairValueF2"
        | "newListChairValueF3";

      acc[indexKey] = seatsByFloor.map((seat) => seat.seat).join(",");
      acc[valueKey] = seatsByFloor.map((seat) => seat.code).join(",");

      return acc;
    },
    {
      newListChairIndexF1: "",
      newListChairIndexF2: "",
      newListChairIndexF3: "",
      newListChairValueF1: "",
      newListChairValueF2: "",
      newListChairValueF3: ""
    }
  );
};

const OrderHistorySwapSeatsPage = () => {
  const { message } = useAntdApp();

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const planScreeningId = Number(searchParams.get("plan-screening"));
  const returnTo = searchParams.get("returnTo") || "/order-history";
  const successReturnTo = searchParams.get("successReturnTo") || "/order-history";
  const reopenOrderId = searchParams.get("reopenOrderId");
  const orderId = Number(id);
  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);
  const limitWarningRef = useRef(0);

  const { data: orderDetail, isFetching: isFetchingOrder } = useOrderDetail(orderId);
  const { data: planScreeningDetail, isFetching: isFetchingPlanScreening } =
    usePlanScreeningDetail(planScreeningId);
  const { data: screeningOrders, isFetching: isFetchingScreeningOrders } =
    useOrdersByScreening(planScreeningId);
  const swapSeats = useSwapSeats();
  const updateOrder = useUpdateOrder();
  const [isCancelReservePending, setIsCancelReservePending] = useState(false);

  const requiredSeatCount = useMemo(
    () => orderDetail?.order.items.reduce((total, item) => total + item.quantity, 0) ?? 0,
    [orderDetail]
  );

  const totalPrice = useMemo(
    () => selectedSeats.reduce((total, seat) => total + seat.price, 0),
    [selectedSeats]
  );

  const selectedSeatText = useMemo(
    () => selectedSeats.map((seat) => seat.code).join(", "),
    [selectedSeats]
  );

  const handleSelectionLimitReached = useCallback(() => {
    const now = Date.now();

    if (now - limitWarningRef.current < 1200) {
      return;
    }

    limitWarningRef.current = now;
    message.warning(`Bạn chỉ được chọn đúng ${requiredSeatCount} ghế cho đơn này`);
  }, [message, requiredSeatCount]);

  const handleSwapSeats = async () => {
    if (!orderDetail || !planScreeningId) {
      return;
    }

    try {
      await swapSeats.mutateAsync({
        orderId: orderDetail.order.id,
        planScreenId: planScreeningId,
        ...buildSeatFieldsByFloor(selectedSeats)
      });

      await updateOrder.mutateAsync({
        id: orderDetail.order.id,
        dto: {
          orderStatusId: OrderStatus.COMPLETED,
          paymentStatusId:
            resolveOrderPaymentStatus(orderDetail.order) ?? orderDetail.order.paymentStatusId,
          shippingStatusId: orderDetail.order.shippingStatusId
        }
      });

      message.success("Đổi ghế thành công");
      setSelectedSeats([]);
      queryClient.invalidateQueries({
        queryKey: planScreeningsKeys.getDetail(orderDetail.order.planScreenId)
      });
      queryClient.invalidateQueries({
        queryKey: planScreeningsKeys.getDetail(planScreeningId)
      });
      queryClient.invalidateQueries({
        queryKey: ordersKeys.getDetail(orderDetail.order.id)
      });
      queryClient.invalidateQueries({
        queryKey: ordersKeys.all
      });
      const nextReturnTo = new URL(successReturnTo, window.location.origin);

      if (reopenOrderId) {
        nextReturnTo.searchParams.set("reopenOrderId", reopenOrderId);
      }

      navigate(`${nextReturnTo.pathname}${nextReturnTo.search}`, { replace: true });
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Đổi ghế thất bại"));
    }
  };

  const handleCancelReserve = async () => {
    const selectedSeatCodes = new Set(
      selectedSeats.map((seat) => `${seat.floor}-${seat.code.trim().toUpperCase()}`)
    );
    const orderIds = Array.from(
      new Set(
        (screeningOrders || [])
          .filter((order) =>
            order.items.some((item) =>
              [item.listChairValueF1, item.listChairValueF2, item.listChairValueF3].some(
                (seatValues, floorIndex) =>
                  (seatValues || "")
                    .split(",")
                    .map((seat) => seat.trim())
                    .filter(Boolean)
                    .some((seatCode) =>
                      selectedSeatCodes.has(`${floorIndex + 1}-${seatCode.toUpperCase()}`)
                    )
              )
            )
          )
          .map((order) => order.id)
      )
    );

    if (orderIds.length === 0) {
      message.error("Không xác định được đơn giữ chỗ của các ghế đã chọn");
      return;
    }

    setIsCancelReservePending(true);

    try {
      await ordersApi.cancelReserve({
        listChairIndexF1: selectedSeats.filter((seat) => seat.floor === 1).map((seat) => seat.seat),
        listChairIndexF2: selectedSeats.filter((seat) => seat.floor === 2).map((seat) => seat.seat),
        listChairIndexF3: selectedSeats.filter((seat) => seat.floor === 3).map((seat) => seat.seat),
        orderIds
      });

      message.success("Hủy giữ chỗ thành công");
      setSelectedSeats([]);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: planScreeningsKeys.getDetail(planScreeningId)
        }),
        queryClient.invalidateQueries({
          queryKey: ordersKeys.getOrdersByScreening(planScreeningId)
        }),
        queryClient.invalidateQueries({
          queryKey: ordersKeys.getDetail(orderId)
        }),
        queryClient.invalidateQueries({
          queryKey: ordersKeys.all
        })
      ]);
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Hủy giữ chỗ thất bại"));
    } finally {
      setIsCancelReservePending(false);
    }
  };

  if (!id) {
    return null;
  }

  return (
    <Spin spinning={isFetchingOrder || isFetchingPlanScreening || isFetchingScreeningOrders}>
      <div className="relative flex flex-col h-screen overflow-hidden select-none">
        <Seats
          data={planScreeningDetail}
          selectedSeats={selectedSeats}
          setSelectedSeats={setSelectedSeats}
          maxSelectableSeats={requiredSeatCount}
          onSelectionLimitReached={handleSelectionLimitReached}
        />
        {planScreeningDetail && orderDetail && (
          <div
            data-seat-selection-ignore="true"
            className="shrink-0 border-t border-emerald-900/20 bg-emerald-100/50 px-2 backdrop-blur-md dark:border-emerald-300/20 dark:bg-emerald-950/80"
          >
            <div className="mx-auto grid max-w-6xl grid-cols-[minmax(300px,1fr)_auto] items-center gap-2 p-2">
              <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-1 rounded-md border border-white/55 bg-white/85 px-3 py-2 text-sm shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/35">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="shrink-0 text-slate-500 dark:text-slate-300">Mã đơn</span>
                  <span className="truncate font-bold text-slate-900 dark:text-slate-50">
                    {orderDetail.order.id}
                  </span>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="shrink-0 text-slate-500 dark:text-slate-300">Cần chọn</span>
                  <span className="truncate font-bold text-slate-900 dark:text-slate-50">
                    {selectedSeats.length}/{requiredSeatCount}
                  </span>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="shrink-0 text-slate-500 dark:text-slate-300">Ghế mới</span>
                  <span className="truncate text-right font-semibold text-slate-700 dark:text-slate-100">
                    {selectedSeatText || "-"}
                  </span>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="shrink-0 text-slate-500 dark:text-slate-300">Giá trị</span>
                  <span className="truncate font-bold text-slate-900 dark:text-slate-50">
                    {formatMoney(totalPrice)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/35">
                <Button
                  type="primary"
                  className="h-9 min-w-26 px-3 font-semibold"
                  icon={<RotateCcw size={15} />}
                  loading={swapSeats.isPending || updateOrder.isPending}
                  disabled={selectedSeats.length !== requiredSeatCount || isCancelReservePending}
                  onClick={handleSwapSeats}
                >
                  Đổi ghế
                </Button>
                <Button
                  variant="outlined"
                  color="orange"
                  className="h-9 min-w-22 border-amber-300 px-3 text-amber-700 hover:border-amber-400! hover:text-amber-700! dark:border-amber-500/40 dark:text-amber-200 dark:hover:border-amber-400! dark:hover:text-amber-100!"
                  icon={<TimerOff size={15} />}
                  loading={isCancelReservePending}
                  disabled={
                    selectedSeats.length === 0 || swapSeats.isPending || updateOrder.isPending
                  }
                  onClick={() => void handleCancelReserve()}
                >
                  Hủy giữ
                </Button>
                <Button
                  className="h-9 min-w-18 px-3 font-semibold"
                  icon={<X size={15} />}
                  onClick={() => {
                    const nextReturnTo = new URL(returnTo, window.location.origin);

                    if (reopenOrderId) {
                      nextReturnTo.searchParams.set("reopenOrderId", reopenOrderId);
                    }

                    navigate(`${nextReturnTo.pathname}${nextReturnTo.search}`, {
                      replace: true
                    });
                  }}
                >
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Spin>
  );
};

export default OrderHistorySwapSeatsPage;
