"use client";

import { bookingTicketAction } from "@/actions/booking-ticket-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { onSelectingChairs } from "@/data/loaders";
import { cn, formatMoney } from "@/lib/utils";
import { useSocketContext } from "@/providers/socket-provider";
import {
  ListSeat,
  PaymentType,
  PlanScreeningDetailProps,
  QrCodeResponseProps,
} from "@/types";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  memo,
} from "react";
import { toast } from "sonner";
import Legend from "./legend";
import QrCodeDialog from "./qr-code-dialog";
import Selecto from "react-selecto";

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
const Seat = memo(({ 
  seat, 
  isSelected, 
  onSelect 
}: { 
  seat: ListSeat; 
  isSelected: boolean; 
  onSelect: (seat: ListSeat) => void;
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
        "relative rounded-lg flex items-center justify-center h-[44px] w-[50px] selectable-seat",
        colorMap[seat.type],
        canSelect && "cursor-pointer",
        isSelected && "bg-whis text-white",
        seat.isContract && "bg-raditz text-white",
        seat.isHold && "bg-roshi text-white",
        seat.status === 1 && "bg-trunks text-white cursor-not-allowed"
      )}
      onClick={handleClick}
      data-seat-code={seat.code}
    >
      <p className="text-sm">
        {seat.type !== 12 ? seat.code : ""}
      </p>
    </div>
  );
});

Seat.displayName = 'Seat';

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

  // Tạo map để tra cứu ghế từ seat code
  const seatMap = useMemo(() => {
    const map: Record<string, ListSeat> = {};
    seats?.forEach(row => {
      row.forEach(seat => {
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

    const handleSelectingUpdate = (payload: unknown) => {
      console.log(payload);
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

  // Tối ưu: chỉ gọi API khi hoàn thành selection thay vì từng ghế
  const batchSelectingChair = useMutation({
    mutationFn: (seatsToUpdate: ListSeat[]) => {
      // Chỉ gọi API nếu thực sự cần real-time update
      // Hoặc bỏ hoàn toàn nếu không cần
      return Promise.resolve();
    },
  });

  const [state, action, pending] = useActionState(
    bookingTicketAction,
    INITIAL_STATE
  );
  const prevPendingRef = useRef(pending);
  const lastQrCodeRef = useRef<string | null>(null);

  // Các effects khác giữ nguyên
  useEffect(() => {
    const currentQrCode = state.data?.qrcode ?? null;
    const hasNewQrCode = currentQrCode && lastQrCodeRef.current !== currentQrCode;

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
    setSelectedSeats(prev => {
      const isAlreadySelected = prev.find(s => s.seat === seat.seat);
      if (isAlreadySelected) {
        return prev.filter(s => s.seat !== seat.seat);
      } else {
        return [...prev, seat];
      }
    });
  }, []);

  // Xử lý selecto với debounce để tránh nhiều render
  const handleSelectoSelect = useCallback((e: any) => {
    isSelectingRef.current = true;
    
    setSelectedSeats(prev => {
      const newSelected = new Set(prev.map(s => s.code));
      
      // Thêm ghế mới
      e.added.forEach((el: HTMLElement) => {
        const seatCode = el.getAttribute('data-seat-code');
        if (seatCode && seatMap[seatCode] && !newSelected.has(seatCode)) {
          newSelected.add(seatCode);
        }
      });
      
      // Xóa ghế bị bỏ chọn
      e.removed.forEach((el: HTMLElement) => {
        const seatCode = el.getAttribute('data-seat-code');
        if (seatCode) {
          newSelected.delete(seatCode);
        }
      });

      // Convert back to array
      return Array.from(newSelected).map(code => seatMap[code]).filter(Boolean);
    });

    setTimeout(() => {
      isSelectingRef.current = false;
    }, 100);
  }, [seatMap]);

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

  const totalPrice = useMemo(() => 
    selectedSeats.reduce((acc, cur) => acc + cur.price, 0), 
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

  // Render seats với useMemo để tránh re-render không cần thiết
  const renderedSeats = useMemo(() => {
    return seats?.map((item, index) => (
      <div
        key={index}
        className="flex gap-[6px] items-center justify-center seat-row"
      >
        <div className="text-trunks font-medium h-[44px] w-[50px] flex items-center justify-center text-base">
          {item[4].code.charAt(0)}
        </div>
        {item.map((seat) => (
          <Seat
            key={seat.seat}
            seat={seat}
            isSelected={selectedSeats.some(s => s.code === seat.code)}
            onSelect={handleSelectSeat}
          />
        ))}
        <div className="text-trunks font-medium h-[44px] w-[50px] flex items-center justify-center text-base">
          {item[4].code.charAt(0)}
        </div>
      </div>
    ));
  }, [seats, selectedSeats, handleSelectSeat]);

  return (
    <div className="relative">
      {pending && (
        <div className="absolute inset-0 size-full z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Đang tải...</span>
          </div>
        </div>
      )}
      <div className="bg-goku mt-8 py-6 px-4 rounded-[12px]">
        <div className="mb-6 flex flex-wrap justify-center gap-4 text-sm">
          <Legend color="bg-jiren" label="Ghế mới" />
          <Legend color="bg-whis" label="Đang chọn" />
          <Legend color="bg-roshi" label="Đang giữ chỗ" />
          <Legend color="bg-trunks" label="Ghế đã bán" />
          <Legend color="bg-krillin" label="Ghế VIP" />
          <Legend color="bg-raditz" label="Ghế hợp đồng" />
          <Legend color="bg-chichi" label="Ghế đôi" />
        </div>

        <div className="w-[922px] h-[4px] bg-jiren mx-auto"></div>
        <p className="mt-2 text-center text-sm font-bold text-trunks">
          Màn hình
        </p>

        <div className="mt-6" ref={seatContainerRef}>
          <div className="space-y-[6px] -mx-4">
            {renderedSeats}
          </div>
        </div>

        {/* React-Selecto với cấu hình tối ưu */}
        <Selecto
          ref={selectoRef}
          dragContainer={seatContainerRef.current ? ".seat-row" : undefined}
          selectableTargets={[".selectable-seat"]}
          hitRate={0}
          selectByClick={true}
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
        className={cn(
          "fixed bottom-0 left-0 right-0 bg-white border-t border-beerus z-50",
          isCustomerView && "hidden"
        )}
      >
       <div className="py-4 container flex gap-3">
          <div className="flex-1">
            <div className="flex gap-3">
              <div className="w-3/5">
                <div className="flex items-center">
                  <p className="text-sm text-trunks">Ghế đã chọn</p>
                </div>
              </div>
              <div className="w-2/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox id="terms" />
                    <Label htmlFor="terms">Chọn hủy vé</Label>
                  </div>
                  <Button
                    className="h-6 border border-chichi/60 text-chichi font-bold text-xs rounded-sm"
                    variant="outline"
                  >
                    Hủy vé
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex mt-[10px] gap-3">
              <div className="w-3/5 bg-goku p-4 rounded-sm">
                <div className="grid grid-cols-2 border-b pb-2 text-sm gap-6">
                  <div>
                    <div className="flex items-center">
                      <p className="min-w-[100px] text-trunks">Số vé:</p>
                      <p className="text-whis font-bold flex-1 text-right">
                        {selectedSeats.length}
                      </p>
                    </div>
                    <div className="flex items-center mt-1">
                      <p className="min-w-[100px] text-trunks">Giảm giá:</p>
                      <p className="text-hit font-bold flex-1 text-right">
                        {formatMoney(0)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center">
                      <p className="min-w-[100px] text-trunks">Tiền vé:</p>
                      <p className="font-bold text-right flex-1">
                        {formatMoney(totalPrice)}
                      </p>
                    </div>
                    <div className="flex items-center mt-1">
                      <p className="min-w-[100px] text-trunks">Còn lại:</p>
                      <p className="font-bold text-right flex-1">
                        {formatMoney(0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-sm">
                  <p className="text-trunks">Tiền đã bán:</p>
                  <p className="text-primary font-bold text-base text-right flex-1">
                    {formatMoney(totalPrice)}
                  </p>
                </div>
              </div>
              <div className="w-2/5 bg-goku p-4 text-sm rounded-sm">
                <p className="font-bold">Phương thức</p>
                <RadioGroup
                  defaultValue={PaymentType.POS}
                  value={paymentType}
                  onValueChange={(value) =>
                    setPaymentType(value as PaymentType)
                  }
                  className="grid grid-cols-2 gap-4 mt-4"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={PaymentType.POS} id="pos" />
                    <Label htmlFor="pos">Tiền mặt</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={PaymentType.VNPAY} id="vnpay" />
                    <Label htmlFor="vnpay">Quét VNpayQR</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={PaymentType.VIETQR} id="vietqr" />
                    <Label htmlFor="vietqr">Quét VietQR</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
          <div>
            <div className="flex h-full gap-3">
              <div className="grid grid-cols-2 h-full gap-2">
                <div className="cursor-pointer hover:bg-jiren h-full border border-beerus min-w-[90px] text-xs font-bold flex items-center justify-center rounded-sm gap-1">
                  <Image
                    src="/images/restart_alt.svg"
                    width={16}
                    height={16}
                    alt="icon"
                  />
                  <span>Đổi vé</span>
                </div>
                <div className="cursor-pointer hover:bg-jiren h-full border border-beerus min-w-[90px] text-xs font-bold flex items-center justify-center rounded-sm gap-1">
                  <Image
                    src="/images/card_giftcard.svg"
                    width={16}
                    height={16}
                    alt="icon"
                  />
                  <span>Đổi quà</span>
                </div>
                <div className="cursor-pointer hover:bg-jiren h-full border border-beerus min-w-[90px] text-xs font-bold flex items-center justify-center rounded-sm gap-1">
                  <Image
                    src="/images/living.svg"
                    width={16}
                    height={16}
                    alt="icon"
                  />
                  <span>Giữ chỗ</span>
                </div>
                <div className="cursor-pointer hover:bg-jiren h-full border border-beerus min-w-[90px] text-xs font-bold flex items-center justify-center rounded-sm gap-1">
                  <Image
                    src="/images/close.svg"
                    width={16}
                    height={16}
                    alt="icon"
                  />
                  <span className="text-dodoria">Hủy giữ</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  className="w-full flex-1 flex flex-col"
                  onClick={onBooking}
                >
                  <Image
                    src="/images/ticket.svg"
                    width={24}
                    height={24}
                    alt="icon"
                  />
                  <span className="text-base font-bold">In vé</span>
                </Button>
                <div className="flex items-center gap-3">
                  <Checkbox id="export" />
                  <Label htmlFor="export" className="text-xs">
                    Xuất hóa đơn
                  </Label>
                </div>
              </div>
            </div>
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