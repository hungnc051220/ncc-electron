"use client";

import { usePlanScreeningDetail } from "@renderer/hooks/planScreenings/usePlanScreeningDetail";
import { Spin } from "antd";
import { useParams, useSearchParams } from "react-router";
import Seats from "../planScreening/components/Seats";
import { useState } from "react";
import { ListSeat, ScreenMode } from "@shared/types";
import Actions from "./components/Actions";

const screenMode: ScreenMode = "contract";

const ContractTicketSalesDetailPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const planScreeningId = searchParams.get("plan-screening");
  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);

  const { data, isFetching } = usePlanScreeningDetail(Number(planScreeningId));

  if (!id) return null;

  return (
    <Spin spinning={isFetching}>
      <div className="relative flex flex-col h-screen overflow-hidden select-none">
        <Seats
          data={data}
          selectedSeats={selectedSeats}
          setSelectedSeats={setSelectedSeats}
          screenMode={screenMode}
        />
        {data && (
          <Actions
            data={data}
            contractOrderId={Number(id)}
            planScreeningId={Number(planScreeningId)}
            selectedSeats={selectedSeats}
            setSelectedSeats={setSelectedSeats}
          />
        )}
      </div>
    </Spin>
  );
};

export default ContractTicketSalesDetailPage;
