"use client";

import { bookingTicketAction } from "@/actions/booking-ticket-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn, formatMoney } from "@/lib/utils";
import { useSocketContext } from "@/providers/socket-provider";
import {
  ListSeat,
  PaymentType,
  PlanScreeningDetailProps,
  QrCodeResponseProps,
} from "@/types";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
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
import Legend from "./legend";
import QrCodeDialog from "./qr-code-dialog";

const colorMap: { [key: string]: string } = {
  0: "bg-jiren text-trunks",
  1: "bg-krillin text-white",
  2: "bg-chichi text-white",
  12: "bg-transparent",
};

const INITIAL_STATE = {
  success: false,
  error: null,
  data: undefined,
  orderTotal: 0,
  orderDisccount: 0,
  orderCreatedAt: undefined,
};

interface SeatsProps {
  data: PlanScreeningDetailProps;
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

const Seats = ({ data }: SeatsProps) => {
  const router = useRouter();
  const socketRef = useSocketContext();
  const { listSeats: seats } = data;
  const searchParams = useSearchParams();
  const isCustomerView = searchParams.get("view") === "customer";
  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.POS);
  const [openQrDialog, setOpenQrDialog] = useState(false);
  const [qrDialogData, setQrDialogData] = useState<{
    dataQr: QrCodeResponseProps;
    filmName: string;
    roomName: string;
    projectDate: string;
    projectTime: string;
    selectedSeats: string;
    orderTotal?: number;
    orderDiscount?: number;
    orderCreatedAt?: string;
  } | null>(null);

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

  // Socket effects - giữ nguyên
  useEffect(() => {
    if (!socketRef) return;

    const handleSelectingUpdate = () => {
      // Handle selecting update payload
    };

    const handleOrderPaymentUpdated = (payload: { orderStatus?: number }) => {
      if (payload?.orderStatus === 30) {
        toast.success("Thanh toán thành công");
        setOpenQrDialog(false);
        setQrDialogData(null);
        setSelectedSeats([]);
        if (!isCustomerView) {
          window.electron?.sendQrDialogClose();
        }
        router.refresh();
      }
    };

    socketRef.on("selecting_chair_update", handleSelectingUpdate);
    socketRef.on("orderPaymentUpdated", handleOrderPaymentUpdated);

    return () => {
      socketRef.off("selecting_chair_update", handleSelectingUpdate);
      socketRef.off("orderPaymentUpdated", handleOrderPaymentUpdated);
    };
  }, [socketRef, router, isCustomerView]);

  const [state, action, pending] = useActionState(
    bookingTicketAction,
    INITIAL_STATE
  );
  const prevPendingRef = useRef(pending);
  const lastQrCodeRef = useRef<string | null>(null);

  // Các effects khác giữ nguyên
  useEffect(() => {
    const currentQrCode = state.data?.qrcode ?? null;
    const hasNewQrCode =
      currentQrCode && lastQrCodeRef.current !== currentQrCode;

    if (hasNewQrCode) {
      startTransition(() => {
        setOpenQrDialog(true);
      });
      lastQrCodeRef.current = currentQrCode;

      if (!isCustomerView && state.data) {
        window.electron?.sendQrDialogOpen({
          dataQr: state.data,
          filmName: data.filmInfo.filmName,
          roomName: data.roomInfo.name,
          projectDate: data.projectDate,
          projectTime: data.projectTime,
          selectedSeats: selectedSeats.map((item) => item.code).join(", "),
          orderTotal: state.orderTotal,
          orderDiscount: state.orderDiscount,
          orderCreatedAt: state.orderCreatedAt,
        });
      }
      return;
    }

    if (!currentQrCode) {
      lastQrCodeRef.current = null;
    }
  }, [
    state.data,
    state.orderTotal,
    state.orderDiscount,
    state.orderCreatedAt,
    isCustomerView,
    data,
    selectedSeats,
  ]);

  useEffect(() => {
    const justCompleted = prevPendingRef.current && !pending;
    if (justCompleted && state.success && !state.data) {
      startTransition(() => {
        toast.success("Đặt vé thành công");
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

  // Các effects cho electron
  useEffect(() => {
    if (isCustomerView) {
      window.electron?.onSeatUpdate((data) => setSelectedSeats(data));
      window.electron?.onQrDialogOpen((qrData) => {
        setQrDialogData(qrData);
        setOpenQrDialog(true);
      });
      window.electron?.onQrDialogClose(() => {
        setOpenQrDialog(false);
        setQrDialogData(null);
        setSelectedSeats([]);
      });
    }
  }, [isCustomerView]);

  useEffect(() => {
    if (!isCustomerView && selectedSeats.length >= 0) {
      window.electron?.sendSeatUpdate(selectedSeats);
    }
  }, [selectedSeats, isCustomerView]);

  const totalPrice = useMemo(
    () => selectedSeats.reduce((acc, cur) => acc + cur.price, 0),
    [selectedSeats]
  );

  const onBooking = useCallback(() => {
    if (selectedSeats.length === 0) return;

    const formData = new FormData();
    const floorNo = selectedSeats[0]?.floor || 1;

    type BodyType = {
      planScreenId: number;
      floorNo: number;
      paymentMethodSystemName: string;
      posName: string;
      posShortName: string;
      listChairIndexF1?: string;
      listChairValueF1?: string;
      listChairIndexF2?: string;
      listChairValueF2?: string;
      listChairIndexF3?: string;
      listChairValueF3?: string;
    };

    const body: BodyType = {
      planScreenId: data.id,
      floorNo,
      paymentMethodSystemName: paymentType,
      posName: "POS Machine 1",
      posShortName: "M111",
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
  }, [selectedSeats, data.id, paymentType, action]);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error]);

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
      const minSize = 30;
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
          className="mt-4 flex-1 flex items-center justify-center min-h-0"
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
        className={cn(
          "bg-beerus border-t border-beerus shrink-0",
          isCustomerView && "hidden"
        )}
        style={{ marginTop: "0.75rem" }}
      >
        <div className="p-2 flex gap-3">
          <div className="flex-1">
            <div className="flex gap-4 bg-white p-2">
              <div className="text-sm">
                <div className="flex items-center">
                  <p className="min-w-[70px] text-trunks">Số vé:</p>
                  <p className="text-whis font-bold flex-1 text-right">
                    {selectedSeats.length}
                  </p>
                </div>
                <div className="flex items-center mt-1">
                  <p className="min-w-[70px] text-trunks">Giảm giá:</p>
                  <p className="text-hit font-bold flex-1 text-right">
                    {formatMoney(0)}
                  </p>
                </div>
              </div>
              <div className="text-sm">
                <div className="flex items-center">
                  <p className="min-w-[60px] text-trunks">Tiền vé:</p>
                  <p className="font-bold text-right flex-1">
                    {formatMoney(totalPrice)}
                  </p>
                </div>
                <div className="flex items-center mt-1">
                  <p className="min-w-[60px] text-trunks">Còn lại:</p>
                  <p className="font-bold text-right flex-1">
                    {formatMoney(0)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-trunks text-sm whitespace-nowrap">
                  Thanh toán:
                </p>
                <p className="font-bold flex-1 text-primary text-xl">
                  {formatMoney(totalPrice)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center text-xs">
              <p className="mr-1 whitespace-nowrap">Ghế đã chọn:</p>
              <div className="flex items-center gap-1 max-w-[250px] overflow-hidden">
                {selectedSeats?.map((item) => (
                  <span
                    className="bg-zeno/56 rounded-sm text-white py-px text-xs px-1"
                    key={item.code}
                  >
                    {item.code}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-1 flex gap-1">
              <button className="h-10 flex-1 bg-white border border-dodoria/60 text-dodoria px-2 text-xs rounded-md font-bold">
                Hủy chỗ
              </button>
              <button className="h-10 flex-1 bg-white border px-2 text-xs rounded-md font-bold">
                Giữ chỗ
              </button>
              <button className="h-10 flex-1 bg-white border px-2 text-xs rounded-md font-bold">
                Đổi vé
              </button>
              <button className="h-10 flex-1 bg-white border px-2 text-xs rounded-md font-bold">
                Đổi quà
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <RadioGroup
              defaultValue={PaymentType.POS}
              value={paymentType}
              onValueChange={(value) => setPaymentType(value as PaymentType)}
              className="gap-1"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value={PaymentType.POS} id="pos" />
                <Label htmlFor="pos" className="text-xs">Tiền mặt</Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value={PaymentType.VNPAY} id="vnpay" />
                <Label htmlFor="vnpay" className="text-xs">Quét VNpayQR</Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value={PaymentType.VIETQR} id="vietqr" />
                <Label htmlFor="vietqr" className="text-xs">Quét VietQR</Label>
              </div>
            </RadioGroup>
            <Button className="flex flex-col h-16" onClick={onBooking}>
              <Image
                src="/images/ticket.svg"
                width={24}
                height={24}
                alt="icon"
              />
              <span className="text-base font-bold">In vé</span>
            </Button>
          </div>
        </div>
      </div>

      {openQrDialog && (state.data || qrDialogData?.dataQr) && (
        <QrCodeDialog
          open={openQrDialog}
          onOpenChange={(newOpen: boolean) => setOpenQrDialog(newOpen)}
          filmName={qrDialogData?.filmName || data.filmInfo.filmName}
          roomName={qrDialogData?.roomName || data.roomInfo.name}
          projectDate={qrDialogData?.projectDate || data.projectDate}
          projectTime={qrDialogData?.projectTime || data.projectTime}
          dataQr={qrDialogData?.dataQr || state.data!}
          selectedSeats={
            qrDialogData?.selectedSeats ||
            selectedSeats.map((item) => item.code).join(", ")
          }
          orderTotal={qrDialogData?.orderTotal || state.orderTotal}
          orderDiscount={qrDialogData?.orderDiscount || state.orderDiscount}
          orderCreatedAt={qrDialogData?.orderCreatedAt || state.orderCreatedAt}
        />
      )}
    </div>
  );
};

export default Seats;
