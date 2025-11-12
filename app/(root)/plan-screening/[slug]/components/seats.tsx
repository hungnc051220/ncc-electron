"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn, formatMoney } from "@/lib/utils";
import { ListSeat, PlanScreeningDetailProps } from "@/types";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  startTransition,
  useActionState,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Legend from "./legend";
import { bookingTicketAction, createQrCodeAction } from "@/data/actions";
import QrCodeDialog from "./qr-code-dialog";
import { QrCodeResponseProps } from "@/types";
import { toast } from "sonner";

const colorMap: { [key: string]: string } = {
  0: "bg-jiren text-trunks",
  1: "bg-krillin text-white",
  2: "bg-chichi text-white",
  12: "bg-transparent",
};

enum PaymentType {
  POS = "Pos",
  VNPAY = "VNPAY",
  VIETQR = "VIETQR",
}

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface SeatsProps {
  data: PlanScreeningDetailProps;
}

const Seats = ({ data }: SeatsProps) => {
  const { listSeats: seats } = data;
  const searchParams = useSearchParams();
  const isCustomerView = searchParams.get("view") === "customer";
  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.POS);
  const [openQrDialog, setOpenQrDialog] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<QrCodeResponseProps | null>(
    null
  );
  const [posShortName, setPosShortName] = useState<string>("P1");
  const [bookedSeats, setBookedSeats] = useState<ListSeat[]>([]);
  const [bookedTotalAmount, setBookedTotalAmount] = useState<number>(0);
  const bookingProcessedRef = useRef(false);
  const qrProcessedRef = useRef(false);

  const [state, action, pending] = useActionState(
    bookingTicketAction,
    INITIAL_STATE
  );

  const [qrState, qrAction, qrPending] = useActionState(
    createQrCodeAction,
    INITIAL_STATE
  );

  const handleSelectSeat = (seat: ListSeat) => {
    setSelectedSeats((prev) => {
      if (prev.find((s) => s.seat === seat.seat)) {
        return prev.filter((s) => s.seat !== seat.seat);
      } else {
        return [...prev, seat];
      }
    });
  };

  useEffect(() => {
    if (isCustomerView) {
      window.electron?.onSeatUpdate((data) => setSelectedSeats(data));
    }
  }, [isCustomerView]);

  useEffect(() => {
    if (!isCustomerView && selectedSeats.length >= 0) {
      window.electron?.sendSeatUpdate(selectedSeats);
    }
  }, [selectedSeats, isCustomerView]);

  const totalPrice = selectedSeats.reduce((acc, cur) => acc + cur.price, 0);

  const onBooking = () => {
    if (selectedSeats.length === 0) return;

    // Store booked seats and total amount before clearing (for QR dialog)
    setBookedSeats([...selectedSeats]);
    setBookedTotalAmount(totalPrice);

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
      posShortName: "P1",
    };

    setPosShortName(body.posShortName);

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
  };

  // Reset refs when state changes
  useEffect(() => {
    if (!state.success) {
      bookingProcessedRef.current = false;
    }
  }, [state.success]);

  useEffect(() => {
    if (!qrState.success) {
      qrProcessedRef.current = false;
    }
  }, [qrState.success]);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error]);

  useLayoutEffect(() => {
    if (state.success && state.formData && !bookingProcessedRef.current) {
      bookingProcessedRef.current = true;
      const bookingResponse = state.formData as Record<string, unknown>;
      const orderId = bookingResponse.orderId as number | undefined;

      console.log("orderId", orderId);

      // Only show QR dialog for VNPAY or VIETQR payment methods
      if (
        (paymentType === PaymentType.VNPAY ||
          paymentType === PaymentType.VIETQR) &&
        orderId
      ) {
        // Call QR code API
        const qrFormData = new FormData();
        qrFormData.append("orderId", orderId.toString());
        qrFormData.append("paymentMethod", paymentType);
        qrFormData.append("shortName", posShortName); // Using the same posShortName from booking

        startTransition(() => {
          qrAction(qrFormData);
        });
      } else {
        // For POS payment, clear seats without showing QR dialog
        queueMicrotask(() => {
          setSelectedSeats([]);
        });
      }
    }
  }, [state.success, state.formData, paymentType, qrAction, posShortName]);

  useLayoutEffect(() => {
    if (qrState.success && qrState.formData && !qrProcessedRef.current) {
      qrProcessedRef.current = true;
      // Type assertion with unknown first to avoid type errors
      const qrData = qrState.formData as unknown as QrCodeResponseProps;
      queueMicrotask(() => {
        setQrCodeData(qrData);
        setSelectedSeats([]);
        setOpenQrDialog(true);
      });
    }
  }, [qrState.success, qrState.formData]);

  return (
    <div className="relative">
      {(pending || qrPending) && (
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

        <div className="mt-6">
          <div className="space-y-[6px] -mx-4">
            {seats?.map((item, index) => (
              <div
                key={index}
                className="flex gap-[6px] items-center justify-center seat"
              >
                <div className="text-trunks font-medium h-[44px] w-[50px] flex items-center justify-center text-base">
                  {item[4].code.charAt(0)}
                </div>
                {item.map((seat) => (
                  <div
                    key={seat.seat}
                    className={cn(
                      "relative rounded-lg flex items-center justify-center h-[44px] w-[50px]",
                      colorMap[seat.type],
                      seat.type !== 12 && seat.status !== 1 && "cursor-pointer",
                      selectedSeats.some((s) => s.code === seat.code) &&
                        "bg-whis text-white",
                      seat.isContract && "bg-raditz text-white",
                      seat.isHold && "bg-roshi text-white",
                      seat.status === 1 &&
                        "bg-trunks text-white cursor-not-allowed"
                    )}
                    onClick={() =>
                      seat.type !== 12 && seat.status !== 1
                        ? handleSelectSeat(seat)
                        : undefined
                    }
                  >
                    <p className="text-sm">
                      {seat.type !== 12 ? seat.code : ""}
                    </p>
                  </div>
                ))}
                <div className="text-trunks font-medium h-[44px] w-[50px] flex items-center justify-center text-base">
                  {item[4].code.charAt(0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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

      {openQrDialog && qrCodeData && (
        <QrCodeDialog
          open={openQrDialog}
          onOpenChange={(newOpen: boolean) => setOpenQrDialog(newOpen)}
          filmName={data.filmInfo.filmName}
          roomName={data.roomInfo.name}
          projectDate={data.projectDate}
          projectTime={data.projectTime}
          qrCode={qrCodeData.qrcode}
          accountName={qrCodeData.accountName}
          accountNumber={qrCodeData.accountNumber}
          totalAmount={bookedTotalAmount}
          selectedSeats={bookedSeats.map((seat) => seat.code).join(", ")}
        />
      )}
    </div>
  );
};

export default Seats;
