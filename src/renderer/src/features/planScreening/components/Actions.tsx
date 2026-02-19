import { EditOutlined } from "@ant-design/icons";
import { CancelOrderDto, OrderDto, ordersApi } from "@renderer/api/orders.api";
import ticketIcon from "@renderer/assets/icons/confirmation_number.svg";
import { useDiscounts } from "@renderer/hooks/discounts/useDiscounts";
import { useCancelOrder } from "@renderer/hooks/orders/useCancelOrder";
import { useCreateOrder } from "@renderer/hooks/orders/useCreateOrder";
import { useCreateQrOrder } from "@renderer/hooks/orders/useCreateQrOrder";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import { cn, formatMoney } from "@renderer/lib/utils";
import { usePrinterStore } from "@renderer/store/printer.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import {
  ApiError,
  DiscountProps,
  ListSeat,
  OrderDetailProps,
  OrderResponseProps,
  PaymentType,
  PlanScreeningDetailProps,
  PrintTicketPayload,
  QrCodeResponseProps
} from "@shared/types";
import { useQueryClient } from "@tanstack/react-query";
import type { DescriptionsProps, GetProp } from "antd";
import { Button, Checkbox, Descriptions, message } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import QRCode from "qrcode";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import DiscountPopup from "./DiscountPopup";
import QrCodeDialog from "./QrCodeDialog";
import VipCardDialog from "./VipCardDialog";
import { ordersKeys } from "@renderer/hooks/orders/keys";

const buildTicketsFromOrder = async (data: OrderDetailProps): Promise<PrintTicketPayload[]> => {
  const tickets: PrintTicketPayload[] = [];
  const qrBase64 = await QRCode.toDataURL(data.order.barCode);

  data.order.items.forEach((item) => {
    const seats = [
      ...(item.listChairValueF1?.split(",") ?? []),
      ...(item.listChairValueF2?.split(",") ?? []),
      ...(item.listChairValueF3?.split(",") ?? [])
    ]
      .map((s) => s.trim())
      .filter(Boolean);

    seats.forEach((seat) => {
      tickets.push({
        cinemaName: "TRUNG TÂM CHIẾU PHIM QUỐC GIA",
        address: "Số 87 Láng Hạ, Ba Đình, Hà Nội",
        movieName: data.film.filmName,
        showTime: dayjs(data.planScreening.projectTime).format("HH:mm"),
        date: dayjs(data.planScreening.projectDate, "YYYY-MM-DD").format("DD/MM/YYYY"),
        seat: seat,
        room: data.room.name,
        floor: data.room.floor,
        price: formatMoney(item.unitPriceInclTax),
        ticketCode: data.order.barCode,
        qrData: qrBase64
      });
    });
  });

  return tickets;
};

const paymentTypes = [
  {
    value: PaymentType.VNPAY,
    label: "Quét VietQR"
  },
  {
    value: PaymentType.VIETQR,
    label: "Quét VNPayQR"
  }
];

interface ActionsProps {
  data: PlanScreeningDetailProps;
  planScreenId: number;
  selectedSeats: ListSeat[];
  setSelectedSeats: Dispatch<SetStateAction<ListSeat[]>>;
  cancelMode: boolean;
  setCancelMode: Dispatch<SetStateAction<boolean>>;
}

interface QrDialogData extends QrCodeResponseProps {
  orderId: number;
  orderTotal: number;
  orderDiscount: number;
  createdOnUtc: string;
}

const Actions = ({
  data,
  planScreenId,
  selectedSeats,
  setSelectedSeats,
  cancelMode,
  setCancelMode
}: ActionsProps) => {
  const [searchParams] = useSearchParams();
  const { posName, posShortName } = useSettingPosStore();
  const selectedPrinter = usePrinterStore((s) => s.selectedPrinter);
  const isCustomerView = searchParams.get("view") === "customer";
  const queryClient = useQueryClient();
  const [vipCard, setVipCard] = useState(false);
  const [openDiscount, setOpenDiscount] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountProps | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<string[]>([]);
  const [openQrDialog, setOpenQrDialog] = useState(false);
  const [openVipCardDialog, setOpenVipCardDialog] = useState(false);
  const [qrData, setQrData] = useState<QrDialogData | undefined>(undefined);

  const { data: discounts } = useDiscounts({ current: 1, pageSize: 20 });
  const createOrder = useCreateOrder();
  const createQr = useCreateQrOrder();
  const cancelOrder = useCancelOrder();

  const lastTotal = sessionStorage.getItem("lastTotal");

  const totalPrice = useMemo(
    () => selectedSeats.reduce((acc, cur) => acc + cur.price, 0),
    [selectedSeats]
  );

  const onBooking = () => {
    if (!posName || !posShortName) return;
    const floorNo = selectedSeats[0]?.floor || 1;

    const body: OrderDto = {
      planScreenId,
      floorNo,
      paymentMethodSystemName: paymentMethod.length > 0 ? paymentMethod[0] : "POS",
      posName,
      posShortName,
      discountId: selectedDiscount?.id,
      isInvitation: false
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

    createOrder.mutate(body, {
      onSuccess: async (order: OrderResponseProps) => {
        const isPaymentQr = paymentMethod.length > 0;
        if (isPaymentQr) {
          try {
            const data = await createQr.mutateAsync({
              orderId: order.id,
              paymentMethod: paymentMethod[0],
              shortName: "M11"
            });
            setQrData({
              ...data,
              orderId: order.id,
              orderTotal: order.orderTotal,
              orderDiscount: order.orderDiscount,
              createdOnUtc: order.createdOnUtc
            });
            setOpenQrDialog(true);
          } catch {
            message.error("Tạo QR thất bại");
          }
          return;
        }

        sessionStorage.setItem("lastTotal", order.orderTotal.toString());
        message.success("Tạo đơn thành công");
        setSelectedSeats([]);
        queryClient.invalidateQueries({
          queryKey: planScreeningsKeys.getDetail(planScreenId)
        });

        try {
          const orderDetail = await queryClient.fetchQuery({
            queryKey: ordersKeys.getDetail(order.id),
            queryFn: () => ordersApi.getDetail(order.id)
          });

          const tickets = await buildTicketsFromOrder(orderDetail);

          await window.api.printTickets(tickets, selectedPrinter);

          message.success("In vé thành công");
        } catch {
          message.error("In vé thất bại");
        }
      },
      onError: (error: unknown) => {
        let msg = "Tạo đơn thất bại";

        if (axios.isAxiosError<ApiError>(error)) {
          msg = error.response?.data?.message ?? msg;
        }

        message.error(msg);
      }
    });
  };

  const onReserveSeats = () => {
    if (!posName || !posShortName) return;
    const floorNo = selectedSeats[0]?.floor || 1;

    const body: OrderDto = {
      planScreenId,
      floorNo,
      paymentMethodSystemName: paymentMethod.length > 0 ? paymentMethod[0] : "POS",
      posName,
      posShortName,
      discountId: selectedDiscount?.id,
      isInvitation: false,
      action: "RESERVE_SEAT"
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

    createOrder.mutate(body, {
      onSuccess: async () => {
        message.success("Giữ chỗ thành công");
        setSelectedSeats([]);
        queryClient.invalidateQueries({
          queryKey: planScreeningsKeys.getDetail(planScreenId)
        });
      },
      onError: (error: unknown) => {
        let msg = "Giữ chỗ thất bại";

        if (axios.isAxiosError<ApiError>(error)) {
          msg = error.response?.data?.message ?? msg;
        }

        message.error(msg);
      }
    });
  };

  const priceDiscount = useMemo(() => {
    if (!selectedDiscount || selectedSeats.length === 0) return 0;
    if (selectedDiscount.discountRate) {
      return selectedSeats.reduce((total, seat) => {
        return total + (seat.price * selectedDiscount.discountRate) / 100;
      }, 0);
    }

    return selectedSeats.reduce((total) => {
      return total + (selectedDiscount.discountAmount || 0);
    }, 0);
  }, [selectedDiscount, selectedSeats]);

  const items: DescriptionsProps["items"] = [
    {
      key: "1",
      label: "Số vé",
      children: <p className="text-right flex-1 font-bold">{selectedSeats.length}</p>
    },
    {
      key: "2",
      label: "Tiền vé",
      children: <p className="text-right flex-1 font-bold">{formatMoney(totalPrice)}</p>
    },
    {
      key: "3",
      label: "Giảm giá",
      children: (
        <div className="flex items-center justify-end flex-1 gap-2">
          <p className="text-right flex-1 font-bold">{formatMoney(priceDiscount)}</p>
          <Button icon={<EditOutlined />} size="small" onClick={() => setOpenDiscount(true)} />
        </div>
      )
    },
    {
      key: "4",
      label: "Thành tiền",
      children: (
        <p className="text-right flex-1 font-bold text-blue-600">
          {formatMoney(totalPrice - priceDiscount)}
        </p>
      )
    }
  ];

  const onChange: GetProp<typeof Checkbox.Group, "onChange"> = (checkedValues) => {
    const last = checkedValues.slice(-1) as string[];
    setPaymentMethod(last);
  };

  const onCancelOrder = (orderIds: number[]) => {
    cancelOrder.mutate(
      {
        planScreenId,
        orderIds,
        cancelReasonId: 0,
        notes: "Huỷ đơn",
        isRefund: false,
        cancelReasonMsg: "Huỷ đơn"
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreenId) });
          message.success("Huỷ đơn thành công");
        },
        onError: (error: unknown) => {
          let msg = "Huỷ đơn thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
        }
      }
    );
  };

  const onCancelSeats = () => {
    const floorNo = selectedSeats[0]?.floor || 1;

    const body: CancelOrderDto = {
      planScreenId,
      cancelReasonId: 0,
      notes: "Huỷ đơn",
      isRefund: true,
      cancelReasonMsg: "Huỷ đơn"
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

    cancelOrder.mutate(body, {
      onSuccess: () => {
        setSelectedSeats([]);
        queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreenId) });
        message.success("Huỷ vé thành công");
      },
      onError: (error: unknown) => {
        let msg = "Huỷ vé thất bại";

        if (axios.isAxiosError<ApiError>(error)) {
          msg = error.response?.data?.message ?? msg;
        }

        message.error(msg);
      }
    });
  };

  return (
    <div
      className={cn("bg-beerus border-t border-gray-300 shrink-0 px-2", isCustomerView && "hidden")}
    >
      <div className="p-2 flex gap-2 items-center justify-center">
        <div className="flex flex-col gap-2">
          <Checkbox checked={cancelMode} onChange={(e) => setCancelMode(e.target.checked)}>
            Huỷ vé
          </Checkbox>
          <Button
            variant="outlined"
            color="danger"
            disabled={!cancelMode || selectedSeats.length === 0}
            onClick={onCancelSeats}
          >
            Huỷ vé
          </Button>
        </div>
        <div className="flex-1 max-w-120 bg-white py-2 px-4 rounded-md">
          <Descriptions size="small" items={items} column={2} />
        </div>
        <div className="text-xs">
          <p className="text-gray-500">Tiền vừa bán:</p>
          <p className="font-bold text-red-500 text-sm">{formatMoney(Number(lastTotal) || 0)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outlined" color="cyan" disabled={createOrder.isPending}>
            Đổi vé
          </Button>
          <Button variant="outlined" color="pink" disabled={createOrder.isPending}>
            Đổi quà
          </Button>
          <Button
            variant="outlined"
            color="green"
            disabled={createOrder.isPending}
            onClick={onReserveSeats}
          >
            Giữ chỗ
          </Button>
          <Button variant="outlined" danger disabled={createOrder.isPending}>
            Hủy giữ
          </Button>
        </div>
        <div className="flex gap-3">
          <div className="flex flex-col">
            <Checkbox checked={vipCard} onChange={(e) => setVipCard(e.target.checked)}>
              Quẹt thẻ VIP
            </Checkbox>
            <Checkbox.Group value={paymentMethod} onChange={onChange}>
              <div className="flex flex-col">
                {paymentTypes.map((paymentType) => (
                  <Checkbox key={paymentType.value} value={paymentType.value}>
                    {paymentType.label}
                  </Checkbox>
                ))}
              </div>
            </Checkbox.Group>
          </div>
          <Button
            type="primary"
            className="flex flex-col"
            style={{ height: "74px" }}
            onClick={() => {
              if (vipCard) {
                setOpenVipCardDialog(true);
                return;
              }

              onBooking();
            }}
            disabled={
              createOrder.isPending ||
              selectedSeats.length === 0 ||
              createQr.isPending ||
              cancelMode
            }
          >
            <img src={ticketIcon} width={24} height={24} alt="icon" />
            <span className="text-base font-bold">In vé</span>
          </Button>
        </div>
      </div>

      <DiscountPopup
        data={discounts?.data}
        openDiscount={openDiscount}
        setOpenDiscount={setOpenDiscount}
        setSelectedDiscount={setSelectedDiscount}
      />

      {openQrDialog && qrData && (
        <QrCodeDialog
          open={openQrDialog}
          onOpenChange={() => setOpenQrDialog(false)}
          filmName={data.filmInfo.filmName}
          dataQr={qrData}
          projectDate={data.projectDate}
          projectTime={data.projectTime}
          roomName={data.roomInfo.name}
          selectedSeats={selectedSeats.map((seat) => seat.code).join(", ")}
          orderId={qrData.orderId}
          orderCreatedAt={qrData.createdOnUtc}
          orderDiscount={qrData.orderDiscount}
          orderTotal={qrData.orderTotal}
          onCancelOrder={onCancelOrder}
        />
      )}

      {openVipCardDialog && (
        <VipCardDialog
          open={openVipCardDialog}
          onCancel={() => setOpenVipCardDialog(false)}
          totalPrice={totalPrice}
          onBooking={onBooking}
        />
      )}
    </div>
  );
};

export default Actions;
