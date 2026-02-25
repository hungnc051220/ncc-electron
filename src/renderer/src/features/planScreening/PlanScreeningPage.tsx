import { usePlanScreeningDetail } from "@renderer/hooks/planScreenings/usePlanScreeningDetail";
import { ListSeat, PlanScreeningDetailProps, QrState } from "@shared/types";
import { Spin } from "antd";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import Actions from "./components/Actions";
import Seats from "./components/Seats";
import { useThemeStore } from "@renderer/store/theme.store";
import QrCodeDialog from "./components/QrCodeDialog";

const PlanScreeningPage = () => {
  const { id } = useParams();
  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);
  const [cancelMode, setCancelMode] = useState(false);
  const [customerData, setCustomerData] = useState<PlanScreeningDetailProps | undefined>(undefined);
  const isCustomerMode = window.location.hash.includes("view=customer");
  const [qrState, setQrState] = useState<QrState>({ isOpen: false });

  const { data, isFetching } = usePlanScreeningDetail(Number(id), isCustomerMode);

  useEffect(() => {
    if (isCustomerMode) return;

    if (data) {
      window.api?.sendCustomerData(data);
    }
  }, [data, isCustomerMode]);

  useEffect(() => {
    if (id && !isCustomerMode) window.api?.openCustomerScreen(Number(id));

    return () => {
      window.api?.closeCustomerScreen();
    };
  }, [id, isCustomerMode]);

  useEffect(() => {
    if (!isCustomerMode) return;

    const unsubscribe = window.api?.onCustomerData((data) => {
      setCustomerData(data);
    });

    return () => unsubscribe?.();
  }, [isCustomerMode]);

  useEffect(() => {
    if (!isCustomerMode) return;

    // Attach listener trước
    const unsubData = window.api?.onCustomerData((data) => {
      setCustomerData(data);
    });

    const unsubSeat = window.api?.onSeatSync((seatState) => {
      setSelectedSeats(seatState.selectedSeats);
      setCancelMode(seatState.cancelMode);
    });

    // Sau đó request state
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
      cancelMode
    });
  }, [selectedSeats, cancelMode, isCustomerMode]);

  useEffect(() => {
    const unsub = window.api?.onThemeUpdate((theme) => {
      useThemeStore.getState().setTheme(theme);
    });

    window.api?.requestTheme();

    return unsub;
  }, []);

  useEffect(() => {
    if (!isCustomerMode) return;

    const unsub = window.api?.onQrSync((state) => {
      console.log("Customer QR sync:", state);
      setQrState(state);
    });

    return unsub;
  }, [isCustomerMode]);

  if (!id && !data) return null;

  const renderData = isCustomerMode ? customerData : data;

  if (!renderData) return null;

  return (
    <Spin spinning={isFetching}>
      <div className="relative flex flex-col h-screen overflow-hidden select-none">
        <Seats
          data={renderData}
          selectedSeats={selectedSeats}
          setSelectedSeats={setSelectedSeats}
          cancelMode={cancelMode}
          isCustomerView={isCustomerMode}
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

        {isCustomerMode && qrState.isOpen && qrState.data && (
          <QrCodeDialog open dataQr={qrState.data} isCustomerView />
        )}
      </div>
    </Spin>
  );
};

export default PlanScreeningPage;
