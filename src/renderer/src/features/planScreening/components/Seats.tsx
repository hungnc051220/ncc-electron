import Legend from "@renderer/components/Legend";
import { useSeatTypes } from "@renderer/hooks/seatTypes/useSeatTypes";
import { cn } from "@renderer/lib/utils";
import {
  ListSeat,
  OrderResponseProps,
  PlanScreeningDetailProps,
  ScreenMode,
  SeatTypeProps
} from "@shared/types";
import { Button, Tag } from "antd";
import dayjs from "dayjs";
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
  selectionMode = "default",
  restrictedSeatKeys,
  spotlightSeatKeys
}: SeatsProps) => {
  const navigate = useNavigate();
  const seatContainerRef = useRef<HTMLDivElement>(null);
  const selectoRef = useRef<Selecto>(null);
  const isSelectingRef = useRef(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const [dragContainer, setDragContainer] = useState<HTMLDivElement | null>(null);
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

  const isSeatBlockedOnline = useCallback(
    (seat: ListSeat) => {
      const key = `noOnlineChairF${seat.floor}` as
        | "noOnlineChairF1"
        | "noOnlineChairF2"
        | "noOnlineChairF3";

      const seatString = data?.[key];
      if (!seatString) return false;

      return seatString.split(",").includes(seat.seat);
    },
    [data]
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

  const handleSelectSeat = useCallback(
    (seat: ListSeat) => {
      const seatUniqueKey = getSeatUniqueKey(seat);
      if (selectingSeatKeysByOther.has(seatUniqueKey)) return;

      setSelectedSeats((prev) => {
        const isAlreadySelected = prev.find((s) => getSeatUniqueKey(s) === seatUniqueKey);
        if (isAlreadySelected) {
          return prev.filter((s) => getSeatUniqueKey(s) !== seatUniqueKey);
        }

        if (maxSelectableSeats && prev.length >= maxSelectableSeats) {
          onSelectionLimitReached?.();
          return prev;
        }

        return [...prev, seat];
      });
    },
    [maxSelectableSeats, onSelectionLimitReached, selectingSeatKeysByOther, setSelectedSeats]
  );

  const handleSelectoSelect = useCallback(
    (e: { added: (HTMLElement | SVGElement)[]; removed: (HTMLElement | SVGElement)[] }) => {
      isSelectingRef.current = true;

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

      setTimeout(() => {
        isSelectingRef.current = false;
      }, 100);
    },
    [
      maxSelectableSeats,
      onSelectionLimitReached,
      seatMap,
      selectingSeatKeysByOther,
      setSelectedSeats
    ]
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
    const seatGap = 6; // gap-1.5
    const rowGap = 4; // space-y-1
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

  const handleHover = (seat: ListSeat, e: React.MouseEvent<HTMLDivElement>) => {
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
    }, 500); // 1 giây
  };

  const handleLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setVisible(false);
    setHoverSeat(null);
  };

  // Render seats với useMemo để tránh re-render không cần thiết
  const renderedSeats = useMemo(() => {
    if (seatSize === null) return null;

    return filteredSeats?.map((item, index) => (
      <div
        key={index}
        className="flex items-center justify-center seat-row"
        style={{ columnGap: "6px", height: `${seatSize}px` }}
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

          return (
            <Seat
              key={seat.seat}
              seat={seat}
              isSelected={selectedSeats.some((s) => getSeatUniqueKey(s) === seatUniqueKey)}
              isSelectingByOther={selectingSeatKeysByOther.has(seatUniqueKey)}
              onSelect={handleSelectSeat}
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
    selectedSeats,
    handleSelectSeat,
    seatSize,
    canSelectSeat,
    cancelMode,
    hasSeatSpotlight,
    isSeatBlockedOnline,
    seatTypeColorMap,
    selectingSeatKeysByOther,
    spotlightSeatKeySet
  ]);

  if (!data) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-app-bg text-black dark:text-white">
      <div className="flex items-center justify-between px-4 py-2 gap-3">
        <div className="flex-1 flex items-center gap-3">
          <div className="flex items-center gap-4">
            <p className="text-chichi text-sm xl:text-lg font-medium">
              Buổi {dayjs(data.projectTime).format("HH:mm")} - Ngày{" "}
              {dayjs(data.projectDate).format("DD/MM/YYYY")}
            </p>
            <p className="font-bold text-base xl:text-xl">{data.filmInfo.filmName}</p>
          </div>
        </div>
        <div className="rounded-lg flex items-center gap-4">
          {availableFloors.length > 1 && (
            <div className="flex justify-center gap-2">
              {availableFloors.map((floor) => (
                <p
                  key={floor}
                  onClick={() => {
                    setUserSelectedFloor(floor);
                    onSelectedFloorChange?.(floor);
                  }}
                  className={cn(
                    "pr-1 border-b-2 border-transparent text-sm font-semibold cursor-pointer transition-all hover:opacity-80",
                    selectedFloor === floor && "border-primary text-primary"
                  )}
                >
                  Tầng {floor}
                </p>
              ))}
            </div>
          )}
          <Tag color="#f50" variant="outlined" className="py-1 px-2 font-semibold">
            PHÒNG {data.roomInfo.name}
          </Tag>

          {!isCustomerView && (
            <Button
              variant="outlined"
              className="ml-4"
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

      <div
        ref={mainContainerRef}
        className="bg-goku dark:bg-app-bg-container p-2 rounded-lg flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <fieldset className="border-t-3 border-jiren w-2/3 mx-auto">
          <legend className="mx-auto px-3 text-sm text-trunks font-bold">Màn hình</legend>
        </fieldset>

        <div
          className={cn(
            "mt-2 flex-1 flex justify-center items-center min-h-0 transition-all duration-200",
            hasSeatSpotlight && cancelMode && "relative"
          )}
          ref={(node) => {
            seatContainerRef.current = node;
            setDragContainer(node);
          }}
        >
          <div
            className="space-y-1 flex flex-col items-center px-2"
            style={{ visibility: seatSize === null ? "hidden" : "visible" }}
          >
            {renderedSeats}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs shrink-0">
          <Legend color="bg-whis" label="Đang chọn" />
          <Legend color="bg-roshi" label="Đang giữ chỗ" />
          <Legend color="bg-trunks" label="Ghế đã bán" />
          {seatTypeLegends.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <div
                className="size-4 rounded-sm border border-app-border"
                style={{ backgroundColor: item.color || "#8f8f8f" }}
              />
              <span className="font-bold text-zeno text-xs">{item.name}</span>
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
            dragContainer={dragContainer ?? undefined}
            selectableTargets={[".selectable-seat"]}
            hitRate={0}
            selectByClick={false}
            selectFromInside={true}
            toggleContinueSelect={["shift"]}
            ratio={0}
            onSelectStart={() => {
              isSelectingRef.current = true;
            }}
            onSelect={handleSelectoSelect}
            onSelectEnd={() => {
              setTimeout(() => {
                isSelectingRef.current = false;
              }, 100);
            }}
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
        />
      )}
    </div>
  );
};

export default Seats;
