"use client";

import { updateSeatContractTicketSaleAction } from "@/actions/contract-ticket-sale-actions";
import Legend from "@/app/(root)/plan-screening/[slug]/components/legend";
import { Button } from "@/components/ui/button";
import { cn, formatMoney } from "@/lib/utils";
import { ListSeat, PlanScreeningDetailProps } from "@/types";
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

  // Tạo map để tra cứu ghế từ seat code
  const seatMap = useMemo(() => {
    const map: Record<string, ListSeat> = {};
    seats?.forEach((row) => {
      row.forEach((seat) => {
        if (seat.type !== 12 && seat.status !== 1) {
          map[seat.code] = seat;
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
  const [selectoContainer, setSelectoContainer] = useState<HTMLElement | null>(
    null
  );

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
      const isAlreadySelected = prev.find((s) => s.seat === seat.seat);
      if (isAlreadySelected) {
        return prev.filter((s) => s.seat !== seat.seat);
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
        const newSelected = new Set(prev.map((s) => s.code));

        // Thêm ghế mới
        e.added.forEach((el) => {
          const seatCode = el.getAttribute("data-seat-code");
          if (seatCode && seatMap[seatCode] && !newSelected.has(seatCode)) {
            newSelected.add(seatCode);
          }
        });

        // Xóa ghế bị bỏ chọn
        e.removed.forEach((el) => {
          const seatCode = el.getAttribute("data-seat-code");
          if (seatCode) {
            newSelected.delete(seatCode);
          }
        });

        // Convert back to array
        return Array.from(newSelected)
          .map((code) => seatMap[code])
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

  // Gắn container cho Selecto sau khi mount để tính toạ độ chính xác trong modal
  useEffect(() => {
    setSelectoContainer(seatContainerRef.current);
  }, []);

  // Tính toán kích thước ghế tự động để fit vào màn hình
  useEffect(() => {
    if (!seats || seats.length === 0 || !seatContainerRef.current) return;

    const calculateSeatSize = () => {
      const container = seatContainerRef.current;
      if (!container) return;

      // Lấy kích thước container ghế
      const containerRect = container.getBoundingClientRect();
      const availableHeight = containerRect.height;
      const availableWidth = containerRect.width;

      // Tính số hàng và số ghế trong hàng dài nhất
      const numRows = seats.length;
      const maxSeatsPerRow = Math.max(...seats.map((row) => row.length));

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
      const minSize = 20;
      const maxSize = 60;
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
  }, [seats]);

  // Render seats với useMemo để tránh re-render không cần thiết
  const renderedSeats = useMemo(() => {
    return seats?.map((item, index) => (
      <div
        key={index}
        className="flex gap-[6px] items-center justify-center seat-row"
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
            isSelected={selectedSeats.some((s) => s.code === seat.code)}
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
  }, [seats, selectedSeats, handleSelectSeat, seatSize]);

  return (
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
        className="bg-goku p-3 rounded-lg flex-1 flex flex-col min-h-0 overflow-hidden"
        style={{ marginTop: "1rem" }}
      >
        <div className="shrink-0">
          <div className="w-full h-[4px] bg-jiren mx-auto"></div>
          <p className="text-center text-sm font-bold text-trunks">Màn hình</p>
        </div>

        <div
          className="mt-4 flex-1 flex items-center justify-center min-h-0 relative"
          ref={seatContainerRef}
        >
          <div className="space-y-[6px] w-full flex flex-col items-center">
            {renderedSeats}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs shrink-0">
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
          ref={selectoRef}
          container={selectoContainer ?? undefined}
          rootContainer={selectoContainer ?? undefined}
          dragContainer={selectoContainer ?? undefined}
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
  );
};

export default Seats;
