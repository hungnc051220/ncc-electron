import { usePlanScreeningDetail } from "@renderer/hooks/planScreenings/usePlanScreeningDetail";
import { useSeatTypes } from "@renderer/hooks/seatTypes/useSeatTypes";
import { useThemeStore } from "@renderer/store/theme.store";
import {
  ListSeat,
  OrderResponseProps,
  PlanScreeningDetailProps,
  QrState,
  SeatTypeProps
} from "@shared/types";
import { Button, Result, Spin } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import Actions from "./components/Actions";
import QrCodeDialog from "./components/QrCodeDialog";
import Seats from "./components/Seats";
import { useOrdersByScreening } from "@renderer/hooks/orders/useOrdersByScreening";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import {
  onSocketConnect,
  onOrderCreated,
  onOrderPaymentUpdated,
  onSelectingChairsUpdate
} from "@renderer/socket/socket";
import { ordersApi } from "@renderer/api/orders.api";
import { useSelectingChairs } from "@renderer/hooks/orders/useSelectingChairs";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import { useQueryClient } from "@tanstack/react-query";

const PlanScreeningPage = () => {
  const { id } = useParams();
  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);
  const [selectingSeatsByOther, setSelectingSeatsByOther] = useState<Record<string, string>>({});
  const [cancelMode, setCancelMode] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [customerData, setCustomerData] = useState<PlanScreeningDetailProps | undefined>(undefined);
  const [customerSeatTypes, setCustomerSeatTypes] = useState<SeatTypeProps[]>([]);
  const [customerOrders, setCustomerOrders] = useState<OrderResponseProps[]>([]);
  const isCustomerMode = window.location.hash.includes("view=customer");
  const [qrState, setQrState] = useState<QrState>({ isOpen: false });
  const { posName } = useSettingPosStore();
  const queryClient = useQueryClient();
  const syncedSelectedSeatsRef = useRef<ListSeat[]>([]);
  const syncedSelectedSeatKeysRef = useRef<Set<string>>(new Set());
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    data,
    isFetching,
    refetch: refetchPlanScreeningDetail
  } = usePlanScreeningDetail(Number(id), isCustomerMode);
  const {
    data: orders,
    isFetching: isFetchingOrders,
    refetch: refetchOrdersByScreening
  } = useOrdersByScreening(Number(id));
  const { data: seatTypesRes } = useSeatTypes({ current: 1, pageSize: 1000 });
  const { mutate: mutateSelectingChairs } = useSelectingChairs();
  const mutateSelectingChairsRef = useRef(mutateSelectingChairs);
  const seatTypes = useMemo(() => seatTypesRes?.data || [], [seatTypesRes]);
  const seatKeyLookup = useMemo(() => {
    const lookup = new Map<string, string>();

    (data?.listSeats || []).forEach((seatRow) => {
      seatRow.forEach((seat) => {
        lookup.set(`${seat.floor}-${seat.rows}:${seat.column}`, `${seat.floor}-${seat.seat}`);
      });
    });

    return lookup;
  }, [data?.listSeats]);

  const selectedSeatKeys = useMemo(
    () => new Set(selectedSeats.map((seat) => `${seat.floor}-${seat.seat}`)),
    [selectedSeats]
  );

  const parseSelectingSeatIndexes = useCallback(
    (value: string | undefined, floor: number) => {
      const normalizedValue = (value ?? "").trim();
      if (!normalizedValue) return [];

      const rawSeatIndexes = Array.from(normalizedValue.matchAll(/\[([^\]]+)\]/g))
        .map((match) => match[1]?.trim())
        .filter(Boolean);

      const seatIndexes =
        rawSeatIndexes.length > 0
          ? rawSeatIndexes
          : normalizedValue
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);

      return seatIndexes.map(
        (seatIndex) => seatKeyLookup.get(`${floor}-${seatIndex}`) || `${floor}-${seatIndex}`
      );
    },
    [seatKeyLookup]
  );

  const buildSelectingDto = (planScreenId: number, currentPosName: string, seats: ListSeat[]) => ({
    planScreenId,
    posName: currentPosName,
    selectingChairIndexF1: seats
      .filter((seat) => seat.floor === 1)
      .map((seat) => seat.seat)
      .join(","),
    selectingChairIndexF2: seats
      .filter((seat) => seat.floor === 2)
      .map((seat) => seat.seat)
      .join(","),
    selectingChairIndexF3: seats
      .filter((seat) => seat.floor === 3)
      .map((seat) => seat.seat)
      .join(",")
  });

  useEffect(() => {
    mutateSelectingChairsRef.current = mutateSelectingChairs;
  }, [mutateSelectingChairs]);

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

  useEffect(() => {
    if (!id || isCustomerMode || !posName) return;

    setSelectingSeatsByOther({});
    let isDisposed = false;

    void ordersApi.getSelectingChairs(Number(id)).then((snapshots) => {
      if (isDisposed) return;
      const initialState: Record<string, string> = {};

      snapshots.forEach((snapshot) => {
        if (snapshot.planScreenId !== Number(id) || snapshot.posName === posName) return;

        const seatKeys = [
          ...parseSelectingSeatIndexes(snapshot.selectingChairIndexF1, 1),
          ...parseSelectingSeatIndexes(snapshot.selectingChairIndexF2, 2),
          ...parseSelectingSeatIndexes(snapshot.selectingChairIndexF3, 3)
        ];

        seatKeys.forEach((seatKey) => {
          initialState[seatKey] = snapshot.posName;
        });
      });

      setSelectingSeatsByOther(initialState);
    });

    const cleanup = onSelectingChairsUpdate((payload) => {
      if (payload.planScreenId !== Number(id) || payload.posName === posName) return;

      const seatKeys = [
        ...parseSelectingSeatIndexes(payload.selectingChairIndexF1, 1),
        ...parseSelectingSeatIndexes(payload.selectingChairIndexF2, 2),
        ...parseSelectingSeatIndexes(payload.selectingChairIndexF3, 3)
      ];

      setSelectingSeatsByOther((prev) => {
        const nextState = { ...prev };
        if (payload.operation === "remove") {
          seatKeys.forEach((seatKey) => {
            if (nextState[seatKey] === payload.posName) {
              delete nextState[seatKey];
            }
          });
          return nextState;
        }

        seatKeys.forEach((seatKey) => {
          nextState[seatKey] = payload.posName;
        });

        return nextState;
      });
    });
    return () => {
      isDisposed = true;
      cleanup?.();
    };
  }, [id, isCustomerMode, parseSelectingSeatIndexes, posName]);

  useEffect(() => {
    if (!id || isCustomerMode) return;

    const currentPlanScreenId = Number(id);
    const invalidateCurrentScreeningData = () => {
      void queryClient.invalidateQueries({
        queryKey: planScreeningsKeys.getDetail(currentPlanScreenId)
      });
      void queryClient.invalidateQueries({
        queryKey: ordersKeys.getOrdersByScreening(currentPlanScreenId)
      });
    };

    const cleanupOrderCreated = onOrderCreated((payload) => {
      if (payload.planScreenId !== currentPlanScreenId) return;
      invalidateCurrentScreeningData();
    });

    const cleanupOrderPaymentUpdated = onOrderPaymentUpdated((payload) => {
      if (payload.paymentStatus !== 30) return;
      if (payload.planScreenId !== currentPlanScreenId) return;

      invalidateCurrentScreeningData();
    });

    const cleanupSocketConnect = onSocketConnect(() => {
      invalidateCurrentScreeningData();
    });

    return () => {
      cleanupOrderCreated?.();
      cleanupOrderPaymentUpdated?.();
      cleanupSocketConnect?.();
    };
  }, [id, isCustomerMode, queryClient]);

  useEffect(() => {
    if (!id || isCustomerMode || !posName) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    const syncedSeatKeys = syncedSelectedSeatKeysRef.current;
    const syncedSeats = syncedSelectedSeatsRef.current;

    if (cancelMode) {
      if (syncedSeats.length > 0) {
        mutateSelectingChairsRef.current({
          operation: "remove",
          dto: buildSelectingDto(Number(id), posName, syncedSeats)
        });
      }

      syncedSelectedSeatsRef.current = [];
      syncedSelectedSeatKeysRef.current = new Set();
      return;
    }

    syncTimeoutRef.current = setTimeout(() => {
      const addedSeats = selectedSeats.filter(
        (seat) => !syncedSeatKeys.has(`${seat.floor}-${seat.seat}`)
      );
      const removedSeats = syncedSeats.filter(
        (seat) => !selectedSeatKeys.has(`${seat.floor}-${seat.seat}`)
      );

      if (addedSeats.length > 0) {
        mutateSelectingChairsRef.current({
          operation: "add",
          dto: buildSelectingDto(Number(id), posName, addedSeats)
        });
      }

      if (removedSeats.length > 0) {
        mutateSelectingChairsRef.current({
          operation: "remove",
          dto: buildSelectingDto(Number(id), posName, removedSeats)
        });
      }

      syncedSelectedSeatsRef.current = selectedSeats;
      syncedSelectedSeatKeysRef.current = new Set(selectedSeatKeys);
      syncTimeoutRef.current = null;
    }, 150);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    };
  }, [cancelMode, id, isCustomerMode, posName, selectedSeatKeys, selectedSeats]);

  useEffect(() => {
    if (!id || isCustomerMode || !posName) return;

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }

      const lastSelectedSeats = syncedSelectedSeatsRef.current;
      if (lastSelectedSeats.length === 0) return;

      mutateSelectingChairsRef.current({
        operation: "remove",
        dto: buildSelectingDto(Number(id), posName, lastSelectedSeats)
      });
    };
  }, [id, isCustomerMode, posName]);

  const renderData = isCustomerMode ? customerData : data;
  const renderSeatTypes = isCustomerMode ? customerSeatTypes : seatTypes;
  const renderOrders = isCustomerMode ? customerOrders : orders;

  if (!id) {
    return (
      <div className="flex h-screen items-center justify-center bg-app-bg p-4">
        <Result
          status="warning"
          title="Không tìm thấy mã suất chiếu"
          subTitle="Không xác định được dữ liệu để hiển thị sơ đồ ghế."
          extra={
            !isCustomerMode ? (
              <Button
                type="primary"
                onClick={() => {
                  sessionStorage.removeItem("lastTotal");
                  window.history.back();
                }}
              >
                Quay lại
              </Button>
            ) : null
          }
        />
      </div>
    );
  }

  if (!renderData) {
    if (isFetching || isCustomerMode) {
      return (
        <Spin spinning>
          <div className="h-screen" />
        </Spin>
      );
    }

    return (
      <div className="flex h-screen items-center justify-center bg-app-bg p-4">
        <Result
          status="error"
          title="Không tải được dữ liệu suất chiếu"
          subTitle="Có thể kết nối mạng hoặc API đang gặp sự cố. Bạn vẫn có thể quay lại để thử lại sau."
          extra={
            !isCustomerMode ? (
              <Button
                type="primary"
                onClick={() => {
                  sessionStorage.removeItem("lastTotal");
                  window.history.back();
                }}
              >
                Quay lại
              </Button>
            ) : null
          }
        />
      </div>
    );
  }

  return (
    <Spin spinning={!renderData && isFetching}>
      <div className="relative flex flex-col h-screen overflow-hidden select-none">
        <Seats
          data={renderData}
          orders={renderOrders}
          seatTypes={renderSeatTypes}
          selectedSeats={selectedSeats}
          selectingSeatsByOther={isCustomerMode ? undefined : selectingSeatsByOther}
          setSelectedSeats={setSelectedSeats}
          cancelMode={cancelMode}
          isCustomerView={isCustomerMode}
          syncedSelectedFloor={isCustomerMode ? selectedFloor : undefined}
          onSelectedFloorChange={!isCustomerMode ? setSelectedFloor : undefined}
          isRefreshLoading={!isCustomerMode && (isFetching || isFetchingOrders)}
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
