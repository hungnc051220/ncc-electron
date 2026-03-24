"use client";

import { useOrdersByScreening } from "@renderer/hooks/orders/useOrdersByScreening";
import { usePlanScreeningDetail } from "@renderer/hooks/planScreenings/usePlanScreeningDetail";
import { ListSeat, ScreenMode } from "@shared/types";
import { Spin } from "antd";
import { useState } from "react";
import { useSearchParams } from "react-router";
import Seats from "../planScreening/components/Seats";
import Actions from "./components/Actions";

const screenMode: ScreenMode = "invitation";

const InvitationTicketsDetailPage = () => {
  const [searchParams] = useSearchParams();
  const planScreeningId = searchParams.get("plan-screening");
  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);

  const { data, isFetching } = usePlanScreeningDetail(Number(planScreeningId));
  const { data: orders } = useOrdersByScreening(Number(planScreeningId));

  return (
    <Spin spinning={isFetching}>
      <div className="relative flex flex-col h-screen overflow-hidden select-none">
        <Seats
          data={data}
          orders={orders}
          selectedSeats={selectedSeats}
          setSelectedSeats={setSelectedSeats}
          screenMode={screenMode}
        />
        {data && (
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
