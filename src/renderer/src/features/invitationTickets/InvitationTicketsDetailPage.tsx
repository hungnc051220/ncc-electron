"use client";

import { useOrdersByScreening } from "@renderer/hooks/orders/useOrdersByScreening";
import { usePlanScreeningDetail } from "@renderer/hooks/planScreenings/usePlanScreeningDetail";
import { useSeatTypes } from "@renderer/hooks/seatTypes/useSeatTypes";
import {
  ListSeat,
  OrderResponseProps,
  PlanScreeningDetailProps,
  ScreenMode,
  SeatTypeProps
} from "@shared/types";
import { Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import Seats from "../planScreening/components/Seats";
import Actions from "./components/Actions";

const screenMode: ScreenMode = "invitation";

const InvitationTicketsDetailPage = () => {
  const [searchParams] = useSearchParams();
  const planScreeningId = searchParams.get("plan-screening");
  const isCustomerMode = window.location.hash.includes("view=customer");

  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [customerData, setCustomerData] = useState<PlanScreeningDetailProps | undefined>(undefined);
  const [customerSeatTypes, setCustomerSeatTypes] = useState<SeatTypeProps[]>([]);
  const [customerOrders, setCustomerOrders] = useState<OrderResponseProps[]>([]);

  const {
    data,
    isFetching,
    refetch: refetchPlanScreeningDetail
  } = usePlanScreeningDetail(Number(planScreeningId), isCustomerMode);
  const { data: orders, refetch: refetchOrdersByScreening } = useOrdersByScreening(
    Number(planScreeningId)
  );
  const { data: seatTypesRes } = useSeatTypes({ current: 1, pageSize: 1000 });
  const seatTypes = useMemo(() => seatTypesRes?.data || [], [seatTypesRes]);

  useEffect(() => {
    if (isCustomerMode) return;
    if (!planScreeningId) return;

    void window.api?.openCustomerRoute(
      `/invitation-tickets/create?plan-screening=${planScreeningId}&view=customer`
    );

    return () => {
      void window.api?.closeCustomerScreen();
    };
  }, [isCustomerMode, planScreeningId]);

  useEffect(() => {
    if (isCustomerMode) return;

    if (data) {
      window.api?.sendCustomerData({
        data,
        seatTypes,
        orders: orders || []
      });
    }
  }, [data, isCustomerMode, orders, seatTypes]);

  useEffect(() => {
    if (!isCustomerMode) return;

    const unsubscribe = window.api?.onCustomerData((payload) => {
      setCustomerData(payload?.data || undefined);
      setCustomerSeatTypes(payload?.seatTypes || []);
      setCustomerOrders(payload?.orders || []);
    });

    return () => unsubscribe?.();
  }, [isCustomerMode]);

  useEffect(() => {
    if (!isCustomerMode) return;

    const unsubData = window.api?.onCustomerData((payload) => {
      setCustomerData(payload?.data || undefined);
      setCustomerSeatTypes(payload?.seatTypes || []);
      setCustomerOrders(payload?.orders || []);
    });

    const unsubSeat = window.api?.onSeatSync((seatState) => {
      setSelectedSeats(seatState.selectedSeats);
      setSelectedFloor(seatState.selectedFloor ?? null);
    });

    window.api?.requestCustomerInit();

    return () => {
      unsubData();
      unsubSeat();
    };
  }, [isCustomerMode]);

  useEffect(() => {
    if (isCustomerMode) return;

    window.api?.sendSeatUpdate({
      selectedSeats,
      cancelMode: false,
      selectedFloor
    });
  }, [isCustomerMode, selectedFloor, selectedSeats]);

  const renderData = isCustomerMode ? customerData : data;
  const renderSeatTypes = isCustomerMode ? customerSeatTypes : seatTypes;
  const renderOrders = isCustomerMode ? customerOrders : orders;

  return (
    <Spin spinning={isFetching && !renderData}>
      <div className="relative flex flex-col h-screen overflow-hidden select-none">
        <Seats
          data={renderData}
          orders={renderOrders}
          seatTypes={renderSeatTypes}
          selectedSeats={selectedSeats}
          setSelectedSeats={setSelectedSeats}
          screenMode={screenMode}
          isCustomerView={isCustomerMode}
          syncedSelectedFloor={isCustomerMode ? selectedFloor : undefined}
          onSelectedFloorChange={!isCustomerMode ? setSelectedFloor : undefined}
          onRefreshRequested={
            isCustomerMode
              ? undefined
              : async () => {
                  await Promise.allSettled([
                    refetchPlanScreeningDetail(),
                    refetchOrdersByScreening()
                  ]);
                }
          }
        />
        {!isCustomerMode && data && (
          <Actions
            data={data}
            planScreeningId={Number(planScreeningId)}
            selectedSeats={selectedSeats}
            setSelectedSeats={setSelectedSeats}
          />
        )}
      </div>
    </Spin>
  );
};

export default InvitationTicketsDetailPage;
