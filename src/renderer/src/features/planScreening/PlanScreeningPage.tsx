import { usePlanScreeningDetail } from "@renderer/hooks/planScreenings/usePlanScreeningDetail";
import { ListSeat } from "@renderer/types";
import { Spin } from "antd";
import { useState } from "react";
import { useParams } from "react-router";
import Actions from "./components/Actions";
import Seats from "./components/Seats";

const PlanScreeningPage = () => {
  const { id } = useParams();
  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);
  const [cancelMode, setCancelMode] = useState(false);

  const { data, isFetching } = usePlanScreeningDetail(Number(id));

  if (!id && !data) return null;

  return (
    <Spin spinning={isFetching}>
      <div className="relative flex flex-col h-screen overflow-hidden select-none">
        <Seats
          data={data}
          selectedSeats={selectedSeats}
          setSelectedSeats={setSelectedSeats}
          cancelMode={cancelMode}
        />
        {data && (
          <Actions
            data={data}
            planScreenId={Number(id)}
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

export default PlanScreeningPage;
