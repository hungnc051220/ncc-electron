"use client";

import { useOrderDetail } from "@renderer/hooks/orders/useOrderDetail";
import { useOrdersByScreening } from "@renderer/hooks/orders/useOrdersByScreening";
import { usePlanScreeningDetail } from "@renderer/hooks/planScreenings/usePlanScreeningDetail";
import { Spin } from "antd";
import { useParams, useSearchParams } from "react-router";
import Seats from "../planScreening/components/Seats";
import { useMemo, useState } from "react";
import { ListSeat, ScreenMode } from "@shared/types";
import Actions from "./components/Actions";

const screenMode: ScreenMode = "contract";

const ContractTicketSaleDetailPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const planScreeningId = searchParams.get("plan-screening");
  const planScreeningIdNumber = Number(planScreeningId);
  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);
  const [cancelMode, setCancelMode] = useState(false);

  const { data, isFetching } = usePlanScreeningDetail(planScreeningIdNumber);
  const { data: orderDetail, isFetching: isFetchingOrder } = useOrderDetail(Number(id));
  const { data: screeningOrders, isFetching: isFetchingScreeningOrders } =
    useOrdersByScreening(planScreeningIdNumber);

  const orders = useMemo(() => {
    const mergedOrders = new Map<number, NonNullable<typeof orderDetail>["order"]>();

    screeningOrders?.forEach((order) => {
      mergedOrders.set(order.id, order);
    });

    if (orderDetail?.order) {
      mergedOrders.set(orderDetail.order.id, orderDetail.order);
    }

    return Array.from(mergedOrders.values());
  }, [orderDetail, screeningOrders]);

  const contractSeatKeys = useMemo(() => {
    if (!orderDetail?.order?.items?.length) {
      return [];
    }

    const keys: string[] = [];

    orderDetail.order.items.forEach((item) => {
      if (item.planScreenId !== planScreeningIdNumber) {
        return;
      }

      ([1, 2, 3] as const).forEach((floor) => {
        const key = `listChairIndexF${floor}` as
          | "listChairIndexF1"
          | "listChairIndexF2"
          | "listChairIndexF3";

        const seatIndexes =
          item[key]
            ?.split(",")
            .map((value) => value.trim())
            .filter(Boolean) ?? [];

        seatIndexes.forEach((seatIndex) => {
          keys.push(`${floor}-${seatIndex}`);
        });
      });
    });

    return Array.from(new Set(keys));
  }, [orderDetail, planScreeningIdNumber]);

  if (!id) return null;

  return (
    <Spin spinning={isFetching || isFetchingOrder || isFetchingScreeningOrders}>
      <div className="relative flex flex-col h-screen overflow-hidden select-none">
        <Seats
          data={data}
          orders={orders}
          currentPlanScreeningId={planScreeningIdNumber}
          selectedSeats={selectedSeats}
          setSelectedSeats={setSelectedSeats}
          cancelMode={cancelMode}
          screenMode={screenMode}
          restrictedSeatKeys={cancelMode ? contractSeatKeys : undefined}
          spotlightSeatKeys={cancelMode ? contractSeatKeys : undefined}
        />
        {data && (
          <Actions
            data={data}
            contractOrderId={Number(id)}
            planScreeningId={planScreeningIdNumber}
            selectedSeats={selectedSeats}
            setSelectedSeats={setSelectedSeats}
            cancelMode={cancelMode}
            setCancelMode={setCancelMode}
          />
        )}
      </div>
    </Spin>
  );
};

export default ContractTicketSaleDetailPage;
