"use client";

import { usePlanScreeningDetail } from "@renderer/hooks/planScreenings/usePlanScreeningDetail";
import { ListSeat } from "@shared/types";
import { Spin } from "antd";
import { useState } from "react";
import { useSearchParams } from "react-router";
import Seats from "../planScreening/components/Seats";
import Actions from "./components/Actions";

const InvitationTicketsDetailPage = () => {
  const [searchParams] = useSearchParams();
  const planScreeningId = searchParams.get("plan-screening");
  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);

  const { data, isFetching } = usePlanScreeningDetail(Number(planScreeningId));

  return (
    <Spin spinning={isFetching}>
      <div className="relative flex flex-col h-screen overflow-hidden select-none">
        <Seats data={data} selectedSeats={selectedSeats} setSelectedSeats={setSelectedSeats} />
        {data && (
          <Actions
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
