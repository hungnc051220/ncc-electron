import { usePlanScreeningDetail } from "@renderer/hooks/planScreenings/usePlanScreeningDetail";
import { useSeatTypes } from "@renderer/hooks/seatTypes/useSeatTypes";
import { useThemeStore } from "@renderer/store/theme.store";
import { ListSeat, PlanScreeningDetailProps, QrState, SeatTypeProps } from "@shared/types";
import { Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import Actions from "./components/Actions";
import QrCodeDialog from "./components/QrCodeDialog";
import Seats from "./components/Seats";
import { useOrdersByScreening } from "@renderer/hooks/orders/useOrdersByScreening";

const PlanScreeningPage = () => {
  const { id } = useParams();
  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);
  const [cancelMode, setCancelMode] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [customerData, setCustomerData] = useState<PlanScreeningDetailProps | undefined>(undefined);
  const [customerSeatTypes, setCustomerSeatTypes] = useState<SeatTypeProps[]>([]);
  const isCustomerMode = window.location.hash.includes("view=customer");
  const [qrState, setQrState] = useState<QrState>({ isOpen: false });

  const { data, isFetching } = usePlanScreeningDetail(Number(id), isCustomerMode);
  const { data: orders } = useOrdersByScreening(Number(id));
  const { data: seatTypesRes } = useSeatTypes({ current: 1, pageSize: 1000 });
  const seatTypes = useMemo(() => seatTypesRes?.data || [], [seatTypesRes]);

  useEffect(() => {
    if (isCustomerMode) return;

    if (data) {
      window.api?.sendCustomerData({
        data,
        seatTypes
      });
    }
  }, [data, isCustomerMode, seatTypes]);

  useEffect(() => {
    if (id && !isCustomerMode) window.api?.openCustomerScreen(Number(id));

    return () => {
      window.api?.closeCustomerScreen();
    };
  }, [id, isCustomerMode]);

  useEffect(() => {
    if (!isCustomerMode) return;

    const unsubscribe = window.api?.onCustomerData((payload) => {
      setCustomerData(payload?.data || undefined);
      setCustomerSeatTypes(payload?.seatTypes || []);
    });

    return () => unsubscribe?.();
  }, [isCustomerMode]);

  useEffect(() => {
    if (!isCustomerMode) return;

    const unsubData = window.api?.onCustomerData((payload) => {
      setCustomerData(payload?.data || undefined);
      setCustomerSeatTypes(payload?.seatTypes || []);
    });

    const unsubSeat = window.api?.onSeatSync((seatState) => {
      setSelectedSeats(seatState.selectedSeats);
      setCancelMode(seatState.cancelMode);
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
      cancelMode,
      selectedFloor
    });
  }, [selectedSeats, cancelMode, selectedFloor, isCustomerMode]);

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
      setQrState(state);
    });

    return unsub;
  }, [isCustomerMode]);

  if (!id && !data) return null;

  const renderData = isCustomerMode ? customerData : data;
  const renderSeatTypes = isCustomerMode ? customerSeatTypes : seatTypes;

  if (!renderData) return null;

  return (
    <Spin spinning={isFetching}>
      <div className="relative flex flex-col h-screen overflow-hidden select-none">
        <Seats
          data={renderData}
          orders={orders}
          seatTypes={renderSeatTypes}
          selectedSeats={selectedSeats}
          setSelectedSeats={setSelectedSeats}
          cancelMode={cancelMode}
          isCustomerView={isCustomerMode}
          syncedSelectedFloor={isCustomerMode ? selectedFloor : undefined}
          onSelectedFloorChange={!isCustomerMode ? setSelectedFloor : undefined}
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
