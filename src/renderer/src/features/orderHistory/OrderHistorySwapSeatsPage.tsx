"use client";

import { useOrderDetail } from "@renderer/hooks/orders/useOrderDetail";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { useSwapSeats } from "@renderer/hooks/orders/useSwapSeats";
import { useUpdateOrder } from "@renderer/hooks/orders/useUpdateOrder";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import { usePlanScreeningDetail } from "@renderer/hooks/planScreenings/usePlanScreeningDetail";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { formatMoney } from "@renderer/lib/utils";
import { ListSeat, OrderStatus } from "@shared/types";
import { useQueryClient } from "@tanstack/react-query";
import type { DescriptionsProps } from "antd";
import { Button, Descriptions, Spin, message } from "antd";
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const planScreeningId = Number(searchParams.get("plan-screening"));
  const returnTo = searchParams.get("returnTo") || "/order-history";
  const reopenOrderId = searchParams.get("reopenOrderId");
  const orderId = Number(id);
  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);
  const limitWarningRef = useRef(0);

  const { data: orderDetail, isFetching: isFetchingOrder } = useOrderDetail(orderId);
  const { data: planScreeningDetail, isFetching: isFetchingPlanScreening } =
    usePlanScreeningDetail(planScreeningId);
  const swapSeats = useSwapSeats();
  const updateOrder = useUpdateOrder();

  const requiredSeatCount = useMemo(
    () => orderDetail?.order.items.reduce((total, item) => total + item.quantity, 0) ?? 0,
    [orderDetail]
  );

  const totalPrice = useMemo(
    () => selectedSeats.reduce((total, seat) => total + seat.price, 0),
    [selectedSeats]
  );

  const items: DescriptionsProps["items"] = [
    {
      key: "1",
      label: "Mã đơn",
      children: <p className="text-right flex-1 font-bold">{orderDetail?.order.id ?? "-"}</p>
    },
    {
      key: "2",
      label: "Số vé cần chọn",
      children: <p className="text-right flex-1 font-bold">{requiredSeatCount}</p>
    },
    {
      key: "3",
      label: "Ghế mới",
      children: (
        <p className="flex-1 text-right line-clamp-1 max-w-full">
          {selectedSeats.map((seat) => seat.code).join(", ") || "-"}
        </p>
      )
    },
    {
      key: "4",
      label: "Tổng giá trị",
      children: <p className="text-right flex-1 font-bold">{formatMoney(totalPrice)}</p>
    }
  ];

  const handleSelectionLimitReached = useCallback(() => {
    const now = Date.now();

    if (now - limitWarningRef.current < 1200) {
      return;
    }

    limitWarningRef.current = now;
    message.warning(`Bạn chỉ được chọn đúng ${requiredSeatCount} ghế cho đơn này`);
  }, [requiredSeatCount]);

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
          paymentStatusId: orderDetail.order.paymentStatusId,
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
      const nextReturnTo = new URL(returnTo, window.location.origin);

      if (reopenOrderId) {
        nextReturnTo.searchParams.set("reopenOrderId", reopenOrderId);
      }

      navigate(`${nextReturnTo.pathname}${nextReturnTo.search}`);
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Đổi ghế thất bại"));
    }
  };

  if (!id) {
    return null;
  }

  return (
    <Spin spinning={isFetchingOrder || isFetchingPlanScreening}>
      <div className="relative flex flex-col h-screen overflow-hidden select-none">
        <Seats
          data={planScreeningDetail}
          selectedSeats={selectedSeats}
          setSelectedSeats={setSelectedSeats}
          maxSelectableSeats={requiredSeatCount}
          onSelectionLimitReached={handleSelectionLimitReached}
        />
        {planScreeningDetail && orderDetail && (
          <div className="bg-jiren dark:bg-app-bg border-t border-gray-300 dark:border-app-border shrink-0 px-4">
            <div className="p-2 flex gap-6 max-w-5xl mx-auto">
              <div className="flex-1 bg-app-bg-container py-2 px-4 rounded-md">
                <Descriptions size="small" items={items} column={2} />
              </div>
              <div className="flex gap-3">
                <Button
                  type="primary"
                  className="h-full! font-bold"
                  loading={swapSeats.isPending || updateOrder.isPending}
                  disabled={selectedSeats.length !== requiredSeatCount}
                  onClick={handleSwapSeats}
                >
                  Đổi ghế
                </Button>
                <Button
                  className="h-full! font-bold"
                  onClick={() => {
                    const nextReturnTo = new URL(returnTo, window.location.origin);

                    if (reopenOrderId) {
                      nextReturnTo.searchParams.set("reopenOrderId", reopenOrderId);
                    }

                    navigate(`${nextReturnTo.pathname}${nextReturnTo.search}`);
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
