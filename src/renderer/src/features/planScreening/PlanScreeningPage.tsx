import { usePlanScreeningDetail } from "@renderer/hooks/planScreenings/usePlanScreeningDetail";
import { ListSeat, PlanScreeningDetailProps } from "@shared/types";
import { Spin } from "antd";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import Actions from "./components/Actions";
import Seats from "./components/Seats";

const PlanScreeningPage = () => {
  const { id } = useParams();
  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);
  const [cancelMode, setCancelMode] = useState(false);
  const [customerData, setCustomerData] = useState<PlanScreeningDetailProps | undefined>(undefined);
  const isCustomerMode = window.location.hash.includes("view=customer");

  const { data, isFetching } = usePlanScreeningDetail(Number(id), isCustomerMode);

  useEffect(() => {
    if (isCustomerMode) return;

    if (data) {
      window.api.sendCustomerData(data);
    }
  }, [data, isCustomerMode]);

  useEffect(() => {
    if (id && !isCustomerMode) window.api.openCustomerScreen(Number(id));

    return () => {
      window.api.closeCustomerScreen();
    };
  }, [id, isCustomerMode]);

  useEffect(() => {
    if (!isCustomerMode) return;

    const unsubscribe = window.api.onCustomerData((data) => {
      setCustomerData(data);
    });

    return () => unsubscribe?.();
  }, [isCustomerMode]);

  useEffect(() => {
    if (!isCustomerMode) return;

    // Attach listener trước
    const unsubData = window.api.onCustomerData((data) => {
      setCustomerData(data);
    });

    const unsubSeat = window.api.onSeatSync((seatState) => {
      setSelectedSeats(seatState.selectedSeats);
      setCancelMode(seatState.cancelMode);
    });

    // Sau đó request state
    window.api.requestCustomerInit();

    return () => {
      unsubData();
      unsubSeat();
    };
  }, [isCustomerMode]);

  useEffect(() => {
    if (isCustomerMode) return;

    window.api.sendSeatUpdate({
      selectedSeats,
      cancelMode
    });
  }, [selectedSeats, cancelMode, isCustomerMode]);

  useEffect(() => {
    console.log("isCustomerMode:", isCustomerMode);
  }, [isCustomerMode]);

  useEffect(() => {
    console.log("customerData:", customerData);
  }, [customerData]);

  if (!id && !data) return null;

  const renderData = isCustomerMode ? customerData : data;

  console.log(renderData);

  if (!renderData) return null;

  return (
    <Spin spinning={isFetching}>
      <div className="relative flex flex-col h-screen overflow-hidden select-none">
        <Seats
          data={renderData}
          selectedSeats={selectedSeats}
          setSelectedSeats={setSelectedSeats}
          cancelMode={cancelMode}
        />
        {!isCustomerMode && data && (
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
