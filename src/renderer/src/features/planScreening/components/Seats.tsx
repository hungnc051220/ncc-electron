import Legend from "@renderer/components/Legend";
import { cn } from "@renderer/lib/utils";
import { ListSeat, PlanScreeningDetailProps } from "@shared/types";
import { Button, Tag } from "antd";
import dayjs from "dayjs";
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  selectedSeats: ListSeat[];
  setSelectedSeats: Dispatch<SetStateAction<ListSeat[]>>;
  cancelMode?: boolean;
}

const getSeatUniqueKey = (seat: ListSeat): string => {
  return `${seat.floor}-${seat.code}`;
};

const Seats = ({ data, selectedSeats, setSelectedSeats, cancelMode }: SeatsProps) => {
  const navigate = useNavigate();
  const seatContainerRef = useRef<HTMLDivElement>(null);
  const selectoRef = useRef<Selecto>(null);
  const isSelectingRef = useRef(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const [seatSize, setSeatSize] = useState(44);
  const [userSelectedFloor, setUserSelectedFloor] = useState<number | null>(null);
  const [hoverSeat, setHoverSeat] = useState<ListSeat | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const [visible, setVisible] = useState(false);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const seats = data?.listSeats;

  useEffect(() => {
    setSelectedSeats([]);
  }, [cancelMode, setSelectedSeats]);

  const canSelectSeat = useCallback(
    (seat: ListSeat) => {
      if (seat.type === 12) return false;

      if (cancelMode) {
        return seat.status === 1; // chỉ ghế đã bán
      }

      return seat.status !== 1; // ghế chưa bán
    },
    [cancelMode]
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
    if (userSelectedFloor && availableFloors.includes(userSelectedFloor)) {
      return userSelectedFloor;
    }
    return availableFloors[0];
  }, [availableFloors, userSelectedFloor]);

  const filteredSeats = useMemo(() => {
    if (!seats) return [];
    return seats
      .map((row) => row.filter((seat) => seat.floor === selectedFloor))
      .filter((row) => row.length > 0);
  }, [seats, selectedFloor]);

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

  const handleSelectSeat = useCallback(
    (seat: ListSeat) => {
      setSelectedSeats((prev) => {
        const seatUniqueKey = getSeatUniqueKey(seat);
        const isAlreadySelected = prev.find((s) => getSeatUniqueKey(s) === seatUniqueKey);
        if (isAlreadySelected) {
          return prev.filter((s) => getSeatUniqueKey(s) !== seatUniqueKey);
        } else {
          return [...prev, seat];
        }
      });
    },
    [setSelectedSeats]
  );

  const handleSelectoSelect = useCallback(
    (e: { added: (HTMLElement | SVGElement)[]; removed: (HTMLElement | SVGElement)[] }) => {
      isSelectingRef.current = true;

      setSelectedSeats((prev) => {
        const newSelected = new Set(prev.map((s) => getSeatUniqueKey(s)));

        // Thêm ghế mới
        e.added.forEach((el) => {
          const uniqueKey = el.getAttribute("data-seat-unique-key");
          if (uniqueKey && seatMap[uniqueKey] && !newSelected.has(uniqueKey)) {
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
        return Array.from(newSelected)
          .map((uniqueKey) => seatMap[uniqueKey])
          .filter(Boolean);
      });

      setTimeout(() => {
        isSelectingRef.current = false;
      }, 100);
    },
    [seatMap, setSelectedSeats]
  );

  const calculateSeatSize = useCallback(() => {
    const container = seatContainerRef.current;
    if (!container || !seats) return;

    const usableWidth = Math.floor(container.clientWidth);
    const usableHeight = Math.floor(container.clientHeight);

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

    if (!maxRows || !maxSeatsPerRow) return;

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

    setSeatSize(size);
  }, [seats, availableFloors]);

  // Tính toán kích thước ghế tự động để fit vào màn hình
  // Tính dựa trên tầng có nhiều ghế nhất để đảm bảo tất cả tầng đều fit và nhất quán

  useEffect(() => {
    const container = seatContainerRef.current;
    if (!container) return;

    let raf1: number;
    let raf2: number;

    const runFit = () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);

      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          calculateSeatSize();
        });
      });
    };

    const observer = new ResizeObserver(runFit);

    observer.observe(container);

    // chạy lần đầu
    runFit();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [calculateSeatSize]);

  const handleHover = (seat: ListSeat, e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;

    hoverTimeoutRef.current = setTimeout(() => {
      setHoverSeat(seat);
      setTooltipPos({ x: clientX, y: clientY });
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
    return filteredSeats?.map((item, index) => (
      <div
        key={index}
        className="flex items-center justify-center seat-row"
        style={{ columnGap: "6px", height: `${seatSize}px` }}
      >
        <div
          className="text-trunks font-medium flex items-center justify-center"
          style={{
            width: `${seatSize}px`,
            height: `${seatSize}px`,
            fontSize: `${Math.max(12, seatSize * 0.3)}px`
          }}
        >
          {item[4]?.code?.charAt(0) || ""}
        </div>
        {item.map((seat) => (
          <Seat
            key={seat.seat}
            seat={seat}
            isSelected={selectedSeats.some((s) => getSeatUniqueKey(s) === getSeatUniqueKey(seat))}
            onSelect={handleSelectSeat}
            size={seatSize}
            canSelect={canSelectSeat(seat)}
            onHover={handleHover}
            onLeave={handleLeave}
          />
        ))}
        <div
          className="text-trunks font-medium flex items-center justify-center"
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
  }, [filteredSeats, selectedSeats, handleSelectSeat, seatSize, canSelectSeat]);

  if (!data) return null;

  return (
    <div className="flex-1 flex flex-col h-full">
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
        </div>
      </div>

      <div
        ref={mainContainerRef}
        className="bg-goku p-2 rounded-lg flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <fieldset className="border-t-3 border-jiren w-2/3 mx-auto">
          <legend className="mx-auto px-3 text-sm text-trunks font-bold">Màn hình</legend>
        </fieldset>

        <div
          className="mt-2 flex-1 flex justify-center items-center min-h-0"
          ref={seatContainerRef}
        >
          <div className="space-y-1 flex flex-col items-center px-2">{renderedSeats}</div>
        </div>

        <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs shrink-0">
          <Legend color="bg-jiren" label="Ghế mới" />
          <Legend color="bg-whis" label="Đang chọn" />
          <Legend color="bg-roshi" label="Đang giữ chỗ" />
          <Legend color="bg-trunks" label="Ghế đã bán" />
          <Legend color="bg-krillin" label="Ghế VIP" />
          <Legend color="bg-raditz" label="Ghế hợp đồng" />
          <Legend color="bg-chichi" label="Ghế đôi" />
        </div>

        {/* React-Selecto với cấu hình tối ưu */}
        <Selecto
          key={`selecto-${selectedFloor}`}
          ref={selectoRef}
          dragContainer=".seat-row"
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
      </div>

      {hoverSeat && tooltipPos && (
        <TooltipFloating seat={hoverSeat} position={tooltipPos} visible={visible} />
      )}
    </div>
  );
};

export default Seats;
