import Legend from "@renderer/components/Legend";
import { useSeatTypes } from "@renderer/hooks/seatTypes/useSeatTypes";
import { cn } from "@renderer/lib/utils";
import {
  ListSeat,
  OrderResponseProps,
  OrderStatus,
  PaymentStatus,
  PlanScreeningDetailProps,
  ScreenMode,
  SeatTypeProps
} from "@shared/types";
import { Button } from "antd";
import dayjs from "dayjs";
import { SyncOutlined } from "@ant-design/icons";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useNavigate } from "react-router";
import Selecto from "react-selecto";
import Seat from "./Seat";
import TooltipFloating from "./TooltipFloating";

type TooltipPosition = {
  x: number;
  y: number;
};

const SEAT_COLUMN_GAP = 4;
const SEAT_ROW_GAP = 3;

interface SeatsProps {
  data?: PlanScreeningDetailProps;
  orders?: OrderResponseProps[];
  currentPlanScreeningId?: number;
  seatTypes?: SeatTypeProps[];
  selectedSeats: ListSeat[];
  selectingSeatsByOther?: Record<string, string>;
  setSelectedSeats: Dispatch<SetStateAction<ListSeat[]>>;
  cancelMode?: boolean;
  isCustomerView?: boolean;
  screenMode?: ScreenMode;
  maxSelectableSeats?: number;
  onSelectionLimitReached?: () => void;
  syncedSelectedFloor?: number | null;
  onSelectedFloorChange?: (floor: number) => void;
  onRefreshRequested?: () => Promise<void> | void;
  isRefreshLoading?: boolean;
  selectionMode?: "default" | "emptyOnly";
  restrictedSeatKeys?: string[];
  spotlightSeatKeys?: string[];
}

const getSeatUniqueKey = (seat: ListSeat): string => {
  return `${seat.floor}-${seat.seat}`;
};

const Seats = ({
  data,
  orders,
  currentPlanScreeningId,
  seatTypes,
  selectedSeats,
  selectingSeatsByOther,
  setSelectedSeats,
  cancelMode,
  isCustomerView,
  screenMode = "normal",
  maxSelectableSeats,
  onSelectionLimitReached,
  syncedSelectedFloor,
  onSelectedFloorChange,
  onRefreshRequested,
  isRefreshLoading,
  selectionMode = "default",
  restrictedSeatKeys,
  spotlightSeatKeys
}: SeatsProps) => {
  const navigate = useNavigate();
  const seatContainerRef = useRef<HTMLDivElement>(null);
  const seatGridRef = useRef<HTMLDivElement>(null);
  const selectoRef = useRef<Selecto>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const [seatSize, setSeatSize] = useState<number | null>(null);
  const [userSelectedFloor, setUserSelectedFloor] = useState<number | null>(null);
  const [hoverSeat, setHoverSeat] = useState<ListSeat | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const [visible, setVisible] = useState(false);
  const { data: seatTypesResponse } = useSeatTypes({ current: 1, pageSize: 1000 });

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const seats = data?.listSeats;
  const resolvedSeatTypes = useMemo(
    () => seatTypes || seatTypesResponse?.data || [],
    [seatTypes, seatTypesResponse]
  );
  const restrictedSeatKeySet = useMemo(
    () => new Set(restrictedSeatKeys || []),
    [restrictedSeatKeys]
  );
  const spotlightSeatKeySet = useMemo(() => new Set(spotlightSeatKeys || []), [spotlightSeatKeys]);
  const hasSeatSpotlight = spotlightSeatKeySet.size > 0;
  const selectedSeatKeySet = useMemo(
    () => new Set(selectedSeats.map((seat) => getSeatUniqueKey(seat))),
    [selectedSeats]
  );

  useEffect(() => {
    setSelectedSeats([]);
  }, [cancelMode, setSelectedSeats]);

  const canSelectSeat = useCallback(
    (seat: ListSeat) => {
      const seatUniqueKey = getSeatUniqueKey(seat);

      if (seat.type === 12) return false;

      if (selectionMode === "emptyOnly") {
        return seat.status !== 1 && seat.isHold !== 1;
      }

      // --- Nếu đang ở chế độ hủy ---
      if (cancelMode) {
        // Ghế chưa bán thì không hủy được
        if (seat.status !== 1) return false;

        // 🎫 Màn giấy mời
        if (screenMode === "invitation") {
          return seat.isInvitation === 1;
        }

        // 📄 Màn hợp đồng
        if (screenMode === "contract") {
          return (
            seat.isContract === 1 &&
            (restrictedSeatKeySet.size === 0 || restrictedSeatKeySet.has(seatUniqueKey))
          );
        }

        // 🎟 Màn bán vé thường
        return seat.isInvitation !== 1 && seat.isContract !== 1;
      }

      // --- Nếu đang bán vé ---
      // Ghế hợp đồng chỉ được thao tác khi bật chế độ hủy vé
      if (seat.isContract === 1) {
        return false;
      }

      // Ghế đã có đơn thì disable
      if (seat.status === 1 && seat.isHold !== 1) {
        // 🎫 Giấy mời: cho phép chọn ghế invitation
        if (screenMode === "invitation" && seat.isInvitation === 1) {
          return true;
        }

        // 📄 Hợp đồng: cho phép chọn ghế contract
        if (screenMode === "contract" && seat.isContract === 1) {
          return true;
        }

        return false;
      }

      return true;
    },
    [cancelMode, restrictedSeatKeySet, screenMode, selectionMode]
  );

  const blockedOnlineSeatKeySet = useMemo(() => {
    const parseSeatIndexes = (value: string | undefined, floor: number) =>
      (value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((seatIndex) => `${floor}-${seatIndex}`);

    return new Set([
      ...parseSeatIndexes(data?.noOnlineChairF1, 1),
      ...parseSeatIndexes(data?.noOnlineChairF2, 2),
      ...parseSeatIndexes(data?.noOnlineChairF3, 3)
    ]);
  }, [data?.noOnlineChairF1, data?.noOnlineChairF2, data?.noOnlineChairF3]);

  const isSeatBlockedOnline = useCallback(
    (seat: ListSeat) => blockedOnlineSeatKeySet.has(getSeatUniqueKey(seat)),
    [blockedOnlineSeatKeySet]
  );

  // Tính toán số tầng có sẵn
  const availableFloors = useMemo(() => {
    const floors = new Set<number>();
    seats?.forEach((row) => {
      row.forEach((seat) => {
        if (seat.floor) {
          floors.add(seat.floor);
        }
      });
    });
    return Array.from(floors).sort((a, b) => a - b);
  }, [seats]);

  const selectedFloor = useMemo(() => {
    if (availableFloors.length === 0) return 1;
    if (typeof syncedSelectedFloor === "number" && availableFloors.includes(syncedSelectedFloor)) {
      return syncedSelectedFloor;
    }
    if (userSelectedFloor && availableFloors.includes(userSelectedFloor)) {
      return userSelectedFloor;
    }
    return availableFloors[0];
  }, [availableFloors, userSelectedFloor, syncedSelectedFloor]);

  useEffect(() => {
    onSelectedFloorChange?.(selectedFloor);
  }, [onSelectedFloorChange, selectedFloor]);

  const filteredSeats = useMemo(() => {
    if (!seats) return [];
    return seats
      .map((row) => row.filter((seat) => seat.floor === selectedFloor))
      .filter((row) => row.length > 0);
  }, [seats, selectedFloor]);

  const seatOrderMap = useMemo(() => {
    const map: Record<string, OrderResponseProps> = {};

    const splitSeats = (value?: string) =>
      (value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    orders?.forEach((order) => {
      order.items?.forEach((item) => {
        if (currentPlanScreeningId && item.planScreenId !== currentPlanScreeningId) {
          return;
        }

        [1, 2, 3].forEach((floor) => {
          const indexKey = `listChairIndexF${floor}` as
            | "listChairIndexF1"
            | "listChairIndexF2"
            | "listChairIndexF3";
          const valueKey = `listChairValueF${floor}` as
            | "listChairValueF1"
            | "listChairValueF2"
            | "listChairValueF3";
          const seatKeys = [
            ...splitSeats(item[indexKey]).map((seatIndex) => `${floor}-${seatIndex}`),
            ...splitSeats(item[valueKey]).map((seatValue) => `${floor}-code:${seatValue}`)
          ];

          seatKeys.forEach((mapKey) => {
            const existing = map[mapKey];

            if (!existing) {
              map[mapKey] = order;
              return;
            }

            const existingTime = dayjs(existing.createdOnUtc);
            const incomingTime = dayjs(order.createdOnUtc);

            if (incomingTime.isAfter(existingTime)) {
              map[mapKey] = order;
            }
          });
        });
      });
    });

    return map;
  }, [currentPlanScreeningId, orders]);

  const hoverSeatOrder = useMemo(() => {
    if (!hoverSeat) return undefined;

    return (
      seatOrderMap[`${hoverSeat.floor}-${hoverSeat.seat}`] ||
      seatOrderMap[`${hoverSeat.floor}-code:${hoverSeat.code}`]
    );
  }, [hoverSeat, seatOrderMap]);

  const pendingPaymentSeatKeySet = useMemo(() => {
    const pendingSeatKeys = new Set<string>();

    const splitSeats = (value?: string) =>
      (value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    orders?.forEach((order) => {
      const isPendingPaymentOrder =
        order.orderStatusId === OrderStatus.PENDING &&
        order.paymentStatusId === PaymentStatus.PENDING;

      if (!isPendingPaymentOrder) return;

      order.items?.forEach((item) => {
        if (currentPlanScreeningId && item.planScreenId !== currentPlanScreeningId) {
          return;
        }

        [1, 2, 3].forEach((floor) => {
          const indexKey = `listChairIndexF${floor}` as
            | "listChairIndexF1"
            | "listChairIndexF2"
            | "listChairIndexF3";
          const valueKey = `listChairValueF${floor}` as
            | "listChairValueF1"
            | "listChairValueF2"
            | "listChairValueF3";

          splitSeats(item[indexKey]).forEach((seatIndex) => {
            pendingSeatKeys.add(`${floor}-${seatIndex}`);
          });

          splitSeats(item[valueKey]).forEach((seatValue) => {
            pendingSeatKeys.add(`${floor}-code:${seatValue}`);
          });
        });
      });
    });

    return pendingSeatKeys;
  }, [currentPlanScreeningId, orders]);

  const seatTypeColorMap = useMemo(
    () => new Map(resolvedSeatTypes.map((item) => [item.id, item.color || "#8f8f8f"] as const)),
    [resolvedSeatTypes]
  );

  const seatTypeLegends = useMemo(() => {
    const excludeKeywords = ["đang chọn", "giữ chỗ", "đã bán", "mời", "hợp đồng"];
    const usedPositionIds = new Set<number>();

    seats?.forEach((row) => {
      row.forEach((seat) => {
        if (seat.positionId) {
          usedPositionIds.add(seat.positionId);
        }
      });
    });

    return resolvedSeatTypes.filter((item) => {
      if (!item.isSeat) return false;
      if (!usedPositionIds.has(item.id)) return false;
      const normalizedName = item.name?.toLowerCase() || "";
      return !excludeKeywords.some((keyword) => normalizedName.includes(keyword));
    });
  }, [resolvedSeatTypes, seats]);

  const seatSummary = useMemo(() => {
    const allSeats =
      seats?.flat().filter((seat) => {
        return seat.type !== 12;
      }) || [];

    const totalSeats = allSeats.length;
    const soldSeats = allSeats.filter((seat) => {
      return (
        seat.status === 1 && seat.isHold !== 1 && seat.isInvitation !== 1 && seat.isContract !== 1
      );
    }).length;
    const contractSeats = allSeats.filter((seat) => seat.isContract === 1).length;
    const invitationSeats = allSeats.filter((seat) => seat.isInvitation === 1).length;

    return {
      totalSeats,
      soldSeats,
      contractSeats,
      invitationSeats
    };
  }, [seats]);

  const summaryCards = useMemo(
    () => [
      {
        key: "sold",
        label: "Ghế đã bán",
        value: seatSummary.soldSeats,
        className:
          "border-rose-200/90 bg-rose-50/80 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200"
      },
      {
        key: "contract",
        label: "Ghế HĐ",
        value: seatSummary.contractSeats,
        className:
          "border-amber-200/90 bg-amber-50/80 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200"
      },
      {
        key: "invitation",
        label: "Ghế mời",
        value: seatSummary.invitationSeats,
        className:
          "border-teal-200/90 bg-teal-50/80 text-teal-700 dark:border-teal-400/20 dark:bg-teal-500/10 dark:text-teal-200"
      }
    ],
    [seatSummary.contractSeats, seatSummary.invitationSeats, seatSummary.soldSeats]
  );
  const seatMap = useMemo(() => {
    const map: Record<string, ListSeat> = {};
    seats?.forEach((row) => {
      row.forEach((seat) => {
        if (canSelectSeat(seat)) {
          const uniqueKey = getSeatUniqueKey(seat);
          map[uniqueKey] = seat;
        }
      });
    });
    return map;
  }, [seats, canSelectSeat]);

  const selectingSeatKeysByOther = useMemo(
    () => new Set(Object.keys(selectingSeatsByOther || {})),
    [selectingSeatsByOther]
  );

  const handleSelectoSelect = useCallback(
    (e: { added: (HTMLElement | SVGElement)[]; removed: (HTMLElement | SVGElement)[] }) => {
      setSelectedSeats((prev) => {
        const newSelected = new Set(prev.map((s) => getSeatUniqueKey(s)));
        let hasReachedLimit = false;

        // Thêm ghế mới
        e.added.forEach((el) => {
          const uniqueKey = el.getAttribute("data-seat-unique-key");
          if (
            uniqueKey &&
            seatMap[uniqueKey] &&
            !newSelected.has(uniqueKey) &&
            !selectingSeatKeysByOther.has(uniqueKey)
          ) {
            if (maxSelectableSeats && newSelected.size >= maxSelectableSeats) {
              hasReachedLimit = true;
              return;
            }
            newSelected.add(uniqueKey);
          }
        });

        // Xóa ghế bị bỏ chọn
        e.removed.forEach((el) => {
          const uniqueKey = el.getAttribute("data-seat-unique-key");
          if (uniqueKey) {
            newSelected.delete(uniqueKey);
          }
        });

        // Convert back to array
        const nextSelected = Array.from(newSelected)
          .map((uniqueKey) => seatMap[uniqueKey])
          .filter(Boolean);

        if (hasReachedLimit) {
          onSelectionLimitReached?.();
        }

        return nextSelected;
      });
    },
    [
      maxSelectableSeats,
      onSelectionLimitReached,
      seatMap,
      selectingSeatKeysByOther,
      setSelectedSeats
    ]
  );

  const clearSelectedSeats = useCallback(() => {
    setSelectedSeats([]);
    selectoRef.current?.setSelectedTargets([]);
  }, [setSelectedSeats]);

  useEffect(() => {
    const selecto = selectoRef.current;
    const container = seatContainerRef.current;
    if (!selecto || !container) return;

    const selectedTargets = Array.from(
      container.querySelectorAll<HTMLElement>(".selectable-seat[data-seat-unique-key]")
    ).filter((element) => selectedSeatKeySet.has(element.dataset.seatUniqueKey || ""));

    selecto.setSelectedTargets(selectedTargets);
  }, [selectedSeatKeySet, selectedFloor, filteredSeats]);

  const handleSeatAreaPointerDownCapture = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) return;
      if (target.closest(".selectable-seat")) return;
      if (target !== event.currentTarget && target !== seatGridRef.current) return;
      if (selectedSeats.length === 0) return;

      clearSelectedSeats();
    },
    [clearSelectedSeats, selectedSeats.length]
  );

  const calculateSeatSize = useCallback(() => {
    const container = seatContainerRef.current;
    if (!container || !seats) return null;

    const usableWidth = Math.floor(container.clientWidth);
    const usableHeight = Math.floor(container.clientHeight);
    if (!usableWidth || !usableHeight) return null;

    // ===== Tính rows & seats max =====
    let maxRows = 0;
    let maxSeatsPerRow = 0;

    availableFloors.forEach((floor) => {
      const floorSeats = seats
        .map((row) => row.filter((s) => s.floor === floor))
        .filter((row) => row.length);

      maxRows = Math.max(maxRows, floorSeats.length);

      floorSeats.forEach((row) => {
        maxSeatsPerRow = Math.max(maxSeatsPerRow, row.length);
      });
    });

    if (!maxRows || !maxSeatsPerRow) return null;

    // ===== Layout constants (match CSS thật) =====
    const seatGap = SEAT_COLUMN_GAP;
    const rowGap = SEAT_ROW_GAP;
    const safety = 8; // buffer chống overflow

    // ===== Height-based seat size =====
    const heightSeat = Math.floor((usableHeight - rowGap * (maxRows - 1) - safety) / maxRows);

    // ===== Width-based seat size =====
    // items = seats + 2 labels
    const totalItems = maxSeatsPerRow + 2;

    const widthSeat = Math.floor((usableWidth - seatGap * (totalItems - 1) - safety) / totalItems);

    // ===== Lấy size nhỏ hơn =====
    let size = Math.min(heightSeat, widthSeat);

    // ===== Clamp POS-friendly =====
    size = Math.max(12, Math.min(size, 42));

    // ===== Verify thật grid width =====
    const realGridWidth = size * totalItems + seatGap * (totalItems - 1);

    if (realGridWidth > usableWidth) {
      size -= 1;
    }

    return size;
  }, [seats, availableFloors]);

  // Tính toán kích thước ghế tự động để fit vào màn hình
  // Tính dựa trên tầng có nhiều ghế nhất để đảm bảo tất cả tầng đều fit và nhất quán

  useLayoutEffect(() => {
    const container = seatContainerRef.current;
    if (!container) return;

    let frameId: number | null = null;

    const updateSeatSize = () => {
      const nextSeatSize = calculateSeatSize();
      if (!nextSeatSize) return;

      setSeatSize((prev) => (prev === nextSeatSize ? prev : nextSeatSize));
    };

    const runFit = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }

      frameId = requestAnimationFrame(() => {
        updateSeatSize();
        frameId = null;
      });
    };

    const observer = new ResizeObserver(runFit);

    observer.observe(container);

    updateSeatSize();

    return () => {
      observer.disconnect();
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [calculateSeatSize]);

  const handleHover = useCallback((seat: ListSeat, e: React.MouseEvent<HTMLDivElement>) => {
    if (seat.type === 12) return;

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const anchorX = rect.left + rect.width / 2;
    const anchorY = rect.top + rect.height / 2;

    hoverTimeoutRef.current = setTimeout(() => {
      setHoverSeat(seat);
      setTooltipPos({ x: anchorX, y: anchorY });
      setVisible(true);
    }, 500);
  }, []);

  const handleLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setVisible(false);
    setHoverSeat(null);
  }, []);

  // Render seats với useMemo để tránh re-render không cần thiết
  const renderedSeats = useMemo(() => {
    if (seatSize === null) return null;

    return filteredSeats?.map((item, index) => (
      <div
        key={index}
        className="flex items-center justify-center seat-row"
        style={{ columnGap: `${SEAT_COLUMN_GAP}px`, height: `${seatSize}px` }}
      >
        <div
          className="text-trunks dark:text-white font-medium flex items-center justify-center"
          style={{
            width: `${seatSize}px`,
            height: `${seatSize}px`,
            fontSize: `${Math.max(12, seatSize * 0.3)}px`
          }}
        >
          {item[4]?.code?.charAt(0) || ""}
        </div>
        {item.map((seat) => {
          const seatUniqueKey = getSeatUniqueKey(seat);
          const isSpotlighted = hasSeatSpotlight && spotlightSeatKeySet.has(seatUniqueKey);
          const isDimmed = hasSeatSpotlight && cancelMode && !isSpotlighted;
          const isBlockedOnline = isSeatBlockedOnline(seat);
          const isPendingPayment =
            pendingPaymentSeatKeySet.has(seatUniqueKey) ||
            pendingPaymentSeatKeySet.has(`${seat.floor}-code:${seat.code}`);

          return (
            <Seat
              key={seat.seat}
              seat={seat}
              isSelected={selectedSeatKeySet.has(seatUniqueKey)}
              isPendingPayment={isPendingPayment}
              isSelectingByOther={selectingSeatKeysByOther.has(seatUniqueKey)}
              size={seatSize}
              canSelect={canSelectSeat(seat)}
              isBlockedOnline={isBlockedOnline}
              seatColor={seat.positionId ? seatTypeColorMap.get(seat.positionId) : undefined}
              seatUniqueKey={seatUniqueKey}
              isDimmed={isDimmed}
              isSpotlighted={isSpotlighted}
              onHover={handleHover}
              onLeave={handleLeave}
            />
          );
        })}
        <div
          className="text-trunks dark:text-white font-medium flex items-center justify-center"
          style={{
            width: `${seatSize}px`,
            height: `${seatSize}px`,
            fontSize: `${Math.max(12, seatSize * 0.3)}px`
          }}
        >
          {item[4]?.code?.charAt(0) || ""}
        </div>
      </div>
    ));
  }, [
    filteredSeats,
    selectedSeatKeySet,
    seatSize,
    canSelectSeat,
    cancelMode,
    hasSeatSpotlight,
    isSeatBlockedOnline,
    seatTypeColorMap,
    handleHover,
    handleLeave,
    pendingPaymentSeatKeySet,
    selectingSeatKeysByOther,
    spotlightSeatKeySet
  ]);

  if (!data) return null;

  return (
    <div className="relative flex-1 flex flex-col h-full overflow-hidden text-black dark:text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-app-bg" />
        <div className="absolute inset-0 bg-[linear-gradient(155deg,rgba(244,250,246,0.97),rgba(229,240,233,0.9)_34%,rgba(213,227,218,0.84)_100%)] dark:bg-[linear-gradient(160deg,rgba(6,13,10,0.98),rgba(10,24,17,0.95)_42%,rgba(14,31,22,0.93)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(59,130,246,0.08),transparent_24%),radial-gradient(circle_at_84%_16%,rgba(16,185,129,0.12),transparent_24%),radial-gradient(circle_at_52%_78%,rgba(34,197,94,0.08),transparent_26%)] dark:bg-[radial-gradient(circle_at_16%_20%,rgba(56,189,248,0.08),transparent_24%),radial-gradient(circle_at_84%_16%,rgba(16,185,129,0.1),transparent_22%),radial-gradient(circle_at_52%_78%,rgba(34,197,94,0.08),transparent_24%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04)_34%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)_28%,rgba(255,255,255,0)_100%)]" />
        <div className="absolute inset-0 opacity-18 bg-[linear-gradient(rgba(71,85,105,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(71,85,105,0.05)_1px,transparent_1px)] bg-size-[42px_42px] dark:opacity-10 dark:bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)]" />
        <div className="absolute -top-10 left-4 h-56 w-56 rounded-full bg-sky-300/26 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute top-10 right-0 h-72 w-72 rounded-full bg-emerald-200/22 blur-3xl dark:bg-emerald-500/9" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-green-200/18 blur-3xl dark:bg-green-500/9" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_56%,rgba(6,18,12,0.1)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_0%,transparent_50%,rgba(1,10,6,0.34)_100%)]" />
      </div>

      <div className="relative px-2 pt-2">
        <div className="rounded-xl border border-green-200/70 bg-white/60 px-3 py-2 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.55)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/34">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 justify-self-start">
              {summaryCards.map((card) => (
                <div
                  key={card.key}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 xl:py-1 xl:px-3 text-[10px] xl:text-xs font-semibold",
                    card.className
                  )}
                >
                  <span className="whitespace-nowrap">{card.label}:</span>
                  <span className="text-[10px] xl:text-xs font-semibold">
                    {card.value}/{seatSummary.totalSeats}
                  </span>
                </div>
              ))}
            </div>

            <div className="min-w-0 max-w-[42vw] text-center">
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-sm font-semibold uppercase tracking-[0.16em] text-slate-700 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                  {dayjs(data.projectTime).format("HH:mm")}
                </span>
                <span className="text-slate-500 dark:text-slate-600">•</span>
                <span>{dayjs(data.projectDate).format("DD/MM/YYYY")}</span>
              </div>
              <p className="truncate text-lg font-bold text-slate-950 dark:text-white xl:text-xl">
                {data.filmInfo.filmName}
              </p>
            </div>

            <div className="flex min-w-0 items-center justify-self-end gap-1.5">
              {availableFloors.length > 1 && (
                <div className="flex shrink-0 items-center rounded-xl border border-slate-200/80 bg-slate-50/80 p-0.5 dark:border-white/10 dark:bg-white/5">
                  {availableFloors.map((floor) => (
                    <button
                      key={floor}
                      type="button"
                      onClick={() => {
                        setUserSelectedFloor(floor);
                        onSelectedFloorChange?.(floor);
                      }}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                        selectedFloor === floor
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                      )}
                    >
                      Tầng {floor}
                    </button>
                  ))}
                </div>
              )}

              <Button
                onClick={() => {
                  void onRefreshRequested?.();
                }}
                color="orange"
                variant="filled"
                icon={<SyncOutlined spin={isRefreshLoading} />}
                loading={isRefreshLoading}
                size="small"
                className="px-2.5 text-xs font-semibold"
                iconPlacement="end"
              >
                Phòng {data.roomInfo.name}
              </Button>

              {!isCustomerView && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    sessionStorage.removeItem("lastTotal");
                    navigate(-1);
                  }}
                >
                  Đóng
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={mainContainerRef}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/28 bg-white/20 m-2 p-1 shadow-sm backdrop-blur-xl dark:border-white/8 dark:bg-slate-950/14"
      >
        <fieldset className="border-t-3 border-jiren w-2/3 mx-auto">
          <legend className="mx-auto px-3 text-xs xl:text-sm text-trunks font-bold">
            Màn hình
          </legend>
        </fieldset>

        <div
          className={cn(
            "seat-selecto-drag-area mt-2 flex-1 flex justify-center items-center min-h-0 transition-all duration-200",
            hasSeatSpotlight && cancelMode && "relative"
          )}
          onPointerDownCapture={handleSeatAreaPointerDownCapture}
          ref={seatContainerRef}
        >
          <div
            ref={seatGridRef}
            className="flex flex-col items-center px-2"
            style={{
              rowGap: `${SEAT_ROW_GAP}px`,
              visibility: seatSize === null ? "hidden" : "visible"
            }}
          >
            {renderedSeats}
          </div>
        </div>

        <div className="mt-1 flex flex-wrap justify-center gap-3 shrink-0">
          <Legend color="bg-whis" label="Đang chọn" />
          <Legend color="bg-roshi" label="Đang giữ chỗ" />
          <Legend color="bg-trunks" label="Ghế đã bán" />
          {seatTypeLegends.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <div
                className="size-3 xl:size-4 rounded-sm border border-app-border"
                style={{ backgroundColor: item.color || "#8f8f8f" }}
              />
              <span className="font-bold text-zeno text-[11px] xl:text-xs">{item.name}</span>
            </div>
          ))}
          <Legend color="bg-raditz" label="Ghế hợp đồng" />
          <Legend color="bg-teal-500" label="Vé mời" />
        </div>

        {/* React-Selecto với cấu hình tối ưu */}
        {seatSize !== null && (
          <Selecto
            key={`selecto-${selectedFloor}`}
            ref={selectoRef}
            dragContainer=".seat-selecto-drag-area"
            selectableTargets={[".selectable-seat"]}
            hitRate={0}
            selectByClick={true}
            selectFromInside={true}
            continueSelect={true}
            continueSelectWithoutDeselect={true}
            ratio={0}
            onSelect={handleSelectoSelect}
          />
        )}
      </div>

      {hoverSeat && tooltipPos && (
        <TooltipFloating
          seat={hoverSeat}
          order={hoverSeatOrder}
          currentPlanScreeningId={currentPlanScreeningId}
          position={tooltipPos}
          visible={visible}
          isPendingPayment={
            pendingPaymentSeatKeySet.has(`${hoverSeat.floor}-${hoverSeat.seat}`) ||
            pendingPaymentSeatKeySet.has(`${hoverSeat.floor}-code:${hoverSeat.code}`)
          }
        />
      )}
    </div>
  );
};

export default Seats;
