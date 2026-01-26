"use client";

import { updateSeatContractTicketSaleAction } from "@/actions/contract-ticket-sale-actions";
import { Button } from "@/components/ui/button";
import { cn, formatMoney } from "@/lib/utils";
import {
  ListSeat,
  PlanScreeningDetailProps
} from "@/types";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Loader2 } from "lucide-react";
import {
  memo,
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Selecto from "react-selecto";
import { toast } from "sonner";
import BackButton from "../../plan-screening/[slug]/components/back-button";
import Legend from "../../plan-screening/[slug]/components/legend";

const colorMap: { [key: string]: string } = {
  0: "bg-jiren text-trunks",
  1: "bg-krillin text-white",
  2: "bg-chichi text-white",
  12: "bg-transparent",
};

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface SeatsProps {
  data: PlanScreeningDetailProps;
  editingItemId?: string;
}

// Tách component Seat riêng để tối ưu render
const Seat = memo(
  ({
    seat,
    isSelected,
    onSelect,
    size,
  }: {
    seat: ListSeat;
    isSelected: boolean;
    onSelect: (seat: ListSeat) => void;
    size: number;
  }) => {
    const canSelect = seat.type !== 12 && seat.status !== 1;

    const handleClick = useCallback(() => {
      if (canSelect) {
        onSelect(seat);
      }
    }, [canSelect, onSelect, seat]);

    return (
      <div
        className={cn(
          "relative rounded-sm flex items-center justify-center selectable-seat",
          colorMap[seat.type],
          canSelect && "cursor-pointer",
          isSelected && "bg-whis text-white",
          seat.isContract && "bg-raditz text-white",
          seat.isHold && "bg-roshi text-white",
          seat.status === 1 && "bg-trunks text-white cursor-not-allowed"
        )}
        style={{
          width: `${size * 1.1}px`,
          height: `${size}px`,
        }}
        onClick={handleClick}
        data-seat-code={seat.code}
        data-seat-floor={seat.floor}
        data-seat-unique-key={`${seat.floor}-${seat.code}`}
      >
        <p
          className="text-xs"
          style={{ fontSize: `${Math.max(10, size * 0.25)}px` }}
        >
          {seat.type !== 12 ? seat.code : ""}
        </p>
      </div>
    );
  }
);

Seat.displayName = "Seat";

// Helper function để tạo unique key cho ghế (kết hợp floor và code)
const getSeatUniqueKey = (seat: ListSeat): string => {
  return `${seat.floor}-${seat.code}`;
};

const Seats = ({ data, editingItemId }: SeatsProps) => {
  const { listSeats: seats } = data;
  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);

  // Refs cho react-selecto
  const seatContainerRef = useRef<HTMLDivElement>(null);
  const selectoRef = useRef<Selecto>(null);
  const isSelectingRef = useRef(false);
  const footerRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const [seatSize, setSeatSize] = useState(44);

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

  // State cho tầng được chọn bởi người dùng
  const [userSelectedFloor, setUserSelectedFloor] = useState<number | null>(
    null
  );

  // Tính toán tầng được chọn: ưu tiên userSelectedFloor, nếu không hợp lệ thì dùng tầng đầu tiên
  const selectedFloor = useMemo(() => {
    if (availableFloors.length === 0) return 1;
    if (userSelectedFloor && availableFloors.includes(userSelectedFloor)) {
      return userSelectedFloor;
    }
    return availableFloors[0];
  }, [availableFloors, userSelectedFloor]);

  // Không filter selectedSeats khi đổi tầng - cho phép chọn ghế từ nhiều tầng cùng lúc

  // Filter seats theo tầng được chọn
  const filteredSeats = useMemo(() => {
    if (!seats) return [];
    return seats
      .map((row) => row.filter((seat) => seat.floor === selectedFloor))
      .filter((row) => row.length > 0);
  }, [seats, selectedFloor]);

  // Key prop trên Selecto component sẽ force re-mount khi selectedFloor thay đổi
  // Điều này đảm bảo Selecto nhận biết các element mới sau khi chuyển tầng

  // Tạo map để tra cứu ghế từ unique key (kết hợp floor và code để tránh trùng)
  const seatMap = useMemo(() => {
    const map: Record<string, ListSeat> = {};
    seats?.forEach((row) => {
      row.forEach((seat) => {
        if (seat.type !== 12 && seat.status !== 1) {
          const uniqueKey = getSeatUniqueKey(seat);
          map[uniqueKey] = seat;
        }
      });
    });
    return map;
  }, [seats]);

  const [state, action, pending] = useActionState(
    updateSeatContractTicketSaleAction,
    INITIAL_STATE
  );
  const prevPendingRef = useRef(pending);

  useEffect(() => {
    const justCompleted = prevPendingRef.current && !pending;
    if (justCompleted && state.success) {
      startTransition(() => {
        toast.success("Thiết lập ghế hợp đồng thành công");
        setSelectedSeats([]);
      });
    }
    prevPendingRef.current = pending;
  }, [state, pending]);

  // Sử dụng useCallback để tránh re-render không cần thiết
  const handleSelectSeat = useCallback((seat: ListSeat) => {
    setSelectedSeats((prev) => {
      const seatUniqueKey = getSeatUniqueKey(seat);
      const isAlreadySelected = prev.find(
        (s) => getSeatUniqueKey(s) === seatUniqueKey
      );
      if (isAlreadySelected) {
        return prev.filter((s) => getSeatUniqueKey(s) !== seatUniqueKey);
      } else {
        return [...prev, seat];
      }
    });
  }, []);

  // Xử lý selecto với debounce để tránh nhiều render
  const handleSelectoSelect = useCallback(
    (e: {
      added: (HTMLElement | SVGElement)[];
      removed: (HTMLElement | SVGElement)[];
    }) => {
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
    [seatMap]
  );

  const totalPrice = useMemo(
    () => selectedSeats.reduce((acc, cur) => acc + cur.price, 0),
    [selectedSeats]
  );

  const onUpdateSeat = useCallback(() => {
    if (selectedSeats.length === 0) return;

    const formData = new FormData();
    const floorNo = selectedSeats[0]?.floor || 1;

    type BodyType = {
      id?: string;
      planScreenId: number;
      floorNo: number;
      listChairIndexF1?: string;
      listChairValueF1?: string;
      listChairIndexF2?: string;
      listChairValueF2?: string;
      listChairIndexF3?: string;
      listChairValueF3?: string;
    };

    const body: BodyType = {
      id: editingItemId,
      planScreenId: data.id,
      floorNo,
    };

    if (floorNo === 1) {
      body.listChairIndexF1 = selectedSeats.map((item) => item.seat).join(",");
      body.listChairValueF1 = selectedSeats.map((item) => item.code).join(",");
    } else if (floorNo === 2) {
      body.listChairIndexF2 = selectedSeats.map((item) => item.seat).join(",");
      body.listChairValueF2 = selectedSeats.map((item) => item.code).join(",");
    } else if (floorNo === 3) {
      body.listChairIndexF3 = selectedSeats.map((item) => item.seat).join(",");
      body.listChairValueF3 = selectedSeats.map((item) => item.code).join(",");
    }

    Object.entries(body).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value as string);
      }
    });

    startTransition(() => action(formData));
  }, [selectedSeats, data.id, action, editingItemId]);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error]);

  // Tính toán kích thước ghế tự động để fit vào màn hình
  // Tính dựa trên tầng có nhiều ghế nhất để đảm bảo tất cả tầng đều fit và nhất quán
  useEffect(() => {
    if (!seats || seats.length === 0 || !seatContainerRef.current) return;

    const calculateSeatSize = () => {
      const container = seatContainerRef.current;
      if (!container) return;

      // Lấy kích thước container ghế
      const containerRect = container.getBoundingClientRect();
      const availableHeight = containerRect.height;
      const availableWidth = containerRect.width;

      // Tính toán số hàng và số ghế trong hàng dài nhất của tầng có nhiều ghế nhất
      // Điều này đảm bảo kích thước nhất quán giữa các tầng và không bị tính lại khi đổi tầng
      let maxRows = 0;
      let maxSeatsPerRow = 0;

      // Tìm tầng có nhiều ghế nhất
      availableFloors.forEach((floor) => {
        const floorSeats = seats
          .map((row) => row.filter((seat) => seat.floor === floor))
          .filter((row) => row.length > 0);

        if (floorSeats.length > maxRows) {
          maxRows = floorSeats.length;
        }

        const maxSeatsInFloor = Math.max(
          ...floorSeats.map((row) => row.length)
        );
        if (maxSeatsInFloor > maxSeatsPerRow) {
          maxSeatsPerRow = maxSeatsInFloor;
        }
      });

      // Fallback nếu không tìm thấy tầng nào
      if (maxRows === 0 || maxSeatsPerRow === 0) {
        maxRows = seats.length;
        maxSeatsPerRow = Math.max(...seats.map((row) => row.length));
      }

      const numRows = maxRows;

      // Tính gap giữa các ghế (6px) và label bên trái/phải (ước tính ban đầu)
      const gapBetweenSeats = 6;
      const estimatedLabelWidth = Math.min(availableWidth / 20, 50); // Ước tính dựa trên width
      const totalGapWidth = (maxSeatsPerRow - 1) * gapBetweenSeats;
      const totalGapHeight = (numRows - 1) * 6; // space-y-[6px]

      // Tính kích thước ghế dựa trên width và height, lấy giá trị nhỏ hơn để đảm bảo fit
      const widthBasedSize = Math.floor(
        (availableWidth - estimatedLabelWidth * 2 - totalGapWidth) /
          maxSeatsPerRow
      );
      const heightBasedSize = Math.floor(
        (availableHeight - totalGapHeight) / numRows
      );

      // Chọn giá trị nhỏ hơn và đảm bảo tỉ lệ vuông
      const calculatedSize = Math.min(widthBasedSize, heightBasedSize);

      // Giới hạn kích thước tối thiểu và tối đa
      const minSize = 30;
      const maxSize = 80;
      const finalSize = Math.max(minSize, Math.min(maxSize, calculatedSize));

      setSeatSize(finalSize);
    };

    // Delay nhỏ để đảm bảo layout đã render xong
    const timeoutId = setTimeout(() => {
      calculateSeatSize();
    }, 100);

    // Recalculate khi resize window
    const handleResize = () => {
      calculateSeatSize();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [seats, availableFloors]); // Chỉ tính lại khi seats hoặc availableFloors thay đổi, không phải khi đổi tầng

  // Render seats với useMemo để tránh re-render không cần thiết
  const renderedSeats = useMemo(() => {
    return filteredSeats?.map((item, index) => (
      <div
        key={index}
        className="flex gap-1.5 items-center justify-center seat-row"
        style={{ height: `${seatSize}px` }}
      >
        <div
          className="text-trunks font-medium flex items-center justify-center"
          style={{
            width: `${seatSize}px`,
            height: `${seatSize}px`,
            fontSize: `${Math.max(12, seatSize * 0.3)}px`,
          }}
        >
          {item[4]?.code?.charAt(0) || ""}
        </div>
        {item.map((seat) => (
          <Seat
            key={seat.seat}
            seat={seat}
            isSelected={selectedSeats.some(
              (s) => getSeatUniqueKey(s) === getSeatUniqueKey(seat)
            )}
            onSelect={handleSelectSeat}
            size={seatSize}
          />
        ))}
        <div
          className="text-trunks font-medium flex items-center justify-center"
          style={{
            width: `${seatSize}px`,
            height: `${seatSize}px`,
            fontSize: `${Math.max(12, seatSize * 0.3)}px`,
          }}
        >
          {item[4]?.code?.charAt(0) || ""}
        </div>
      </div>
    ));
  }, [filteredSeats, selectedSeats, handleSelectSeat, seatSize]);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex-1 flex items-center gap-3">
          <BackButton />
          <div className="flex items-center gap-4">
            <p className="text-chichi text-sm xl:text-lg font-medium">
              Buổi {formatInTimeZone(data.projectTime, "UTC", "HH:mm")} - Ngày{" "}
              {format(new Date(data.projectDate), "dd/MM/yyyy")}
            </p>
            <p className="font-bold text-base xl:text-xl">
              {data.filmInfo.filmName}
            </p>
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
                    // Không xóa ghế đã chọn - cho phép chọn ghế từ nhiều tầng cùng lúc
                  }}
                  className={cn(
                    "pr-1 border-b-2 border-transparent text-sm font-bold",
                    selectedFloor === floor && "border-primary text-primary"
                  )}
                >
                  Tầng {floor}
                </p>
              ))}
            </div>
          )}
          <p className="text-sm font-bold bg-beerus py-1 px-2 rounded-sm">
            Phòng {data.roomInfo.name}
          </p>
        </div>
      </div>
      <div
        className="relative flex flex-col"
        style={{ height: "100vh", overflow: "hidden" }}
      >
        {pending && (
          <div className="absolute inset-0 size-full z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Đang tải...</span>
            </div>
          </div>
        )}
        <div
          ref={mainContainerRef}
          className="bg-goku p-2 rounded-lg flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          {/* Button group chọn tầng - chỉ hiển thị khi có nhiều hơn 1 tầng */}

          <fieldset className="border-t-3 border-jiren w-2/3 mx-auto">
            <legend className="mx-auto px-3 text-sm text-trunks font-bold">
              Màn hình
            </legend>
          </fieldset>

          <div
            className="mt-2 flex-1 flex items-center justify-center min-h-0"
            ref={seatContainerRef}
          >
            <div className="space-y-1.5 w-full flex flex-col items-center">
              {renderedSeats}
            </div>
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

        {/* Footer giữ nguyên */}
        <div
          ref={footerRef}
          className={cn("bg-beerus border-t border-beerus shrink-0 rounded-xl")}
          style={{ marginTop: "0.75rem" }}
        >
          <div className="p-2 flex gap-3 max-w-5xl mx-auto">
            <div className="flex-1 rounded-lg">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 bg-white p-2 rounded-md text-xs xl:text-sm">
                <div className="flex items-center">
                  <p className="min-w-[70px] text-trunks">Số vé:</p>
                  <p className="flex-1 text-right">{selectedSeats.length}</p>
                </div>
                <div className="flex items-center">
                  <p className="min-w-[70px] text-trunks">Tổng giá trị:</p>
                  <p className="text-primary font-bold flex-1 text-right">
                    {formatMoney(totalPrice)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="min-w-[70px] text-trunks">Ghế đã chọn:</p>
                  <p className="flex-1 text-right line-clamp-1 max-w-full">
                    {selectedSeats.map((s) => s.code).join(", ")}
                  </p>
                </div>
                <div className="flex items-center">
                  <p className="min-w-[70px] text-trunks">Nhân viên xử lý:</p>
                  <p className="flex-1 text-right">Admin</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                className="h-full font-bold"
                onClick={onUpdateSeat}
                disabled={selectedSeats.length === 0}
              >
                Thêm vé hợp đồng
              </Button>

              <Button variant="destructive" className="h-full font-bold">
                Hủy vé hợp đồng
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Seats;
