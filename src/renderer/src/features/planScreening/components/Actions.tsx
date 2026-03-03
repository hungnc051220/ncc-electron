import { EditOutlined } from "@ant-design/icons";
import { CancelOrderDto, OrderDto, ordersApi } from "@renderer/api/orders.api";
import ticketIcon from "@renderer/assets/icons/confirmation_number.svg";
import { useDiscounts } from "@renderer/hooks/discounts/useDiscounts";
import { useCancelOrder } from "@renderer/hooks/orders/useCancelOrder";
import { useCreateOrder } from "@renderer/hooks/orders/useCreateOrder";
import { useCreateQrOrder } from "@renderer/hooks/orders/useCreateQrOrder";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import { buildTicketsFromOrder, cn, formatMoney } from "@renderer/lib/utils";
import { usePrinterStore } from "@renderer/store/printer.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import {
  ApiError,
  DiscountProps,
  ListSeat,
  OrderResponseProps,
  PaymentType,
  PlanScreeningDetailProps,
  QrDialogData
} from "@shared/types";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { DescriptionsProps, GetProp } from "antd";
import { Button, Checkbox, Descriptions, Form, message, Modal, Select } from "antd";
import axios from "axios";

import { ordersKeys } from "@renderer/hooks/orders/keys";
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import DiscountPopup from "./DiscountPopup";
import QrCodeDialog from "./QrCodeDialog";
import VipCardDialog from "./VipCardDialog";
import { useAuthStore } from "@renderer/store/auth.store";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { onOrderPaymentUpdated } from "@renderer/socket/socket";
import { cancellationReasonsApi } from "@renderer/api/cancellationReasons.api";

const paymentTypes = [
  {
    value: PaymentType.VIETQR,
    label: "Quét VietQR"
  },
  {
    value: PaymentType.VNPAY,
    label: "Quét VNPayQR"
  }
];

type FieldType = {
  cancelReasonId: number;
};

interface ActionsProps {
  data: PlanScreeningDetailProps;
  planScreenId: number;
  selectedSeats: ListSeat[];
  setSelectedSeats: Dispatch<SetStateAction<ListSeat[]>>;
  cancelMode: boolean;
  setCancelMode: Dispatch<SetStateAction<boolean>>;
}

const Actions = ({
  data,
  planScreenId,
  selectedSeats,
  setSelectedSeats,
  cancelMode,
  setCancelMode
}: ActionsProps) => {
  const [form] = Form.useForm();
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
  const [openCancelSeats, setOpenCancelSeats] = useState(false);

  const userId = useAuthStore((s) => s.userId);
  const { data: user } = useUserDetail(userId!);
  const { data: discounts } = useDiscounts({ current: 1, pageSize: 20 });

  const {
    data: cancellationReasons,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["cancellation-reasons"],
    queryFn: ({ pageParam = 1 }) =>
      cancellationReasonsApi.getAll({ current: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  const options = useMemo(() => {
    return (
      cancellationReasons?.pages.flatMap((page) =>
        page.data.map((item) => ({
          value: item.id,
          label: item.reason
        }))
      ) ?? []
    );
  }, [cancellationReasons]);

  const createOrder = useCreateOrder();
  const createQr = useCreateQrOrder();
  const cancelOrder = useCancelOrder();

  const lastTotal = sessionStorage.getItem("lastTotal");

  const handlePrint = useCallback(
    async (orderId: number) => {
      try {
        const orderDetail = await queryClient.fetchQuery({
          queryKey: ordersKeys.getDetail(orderId),
          queryFn: () => ordersApi.getDetail(orderId)
        });

        const tickets = await buildTicketsFromOrder(orderDetail, user?.fullname, posName);

        await window.api?.printTickets(tickets, selectedPrinter);

        message.success("In vé thành công");
      } catch (error) {
        console.error(error);
        message.error("In vé thất bại");
      }
    },
    [queryClient, selectedPrinter, user, posName]
  );

  useEffect(() => {
    const cleanup = onOrderPaymentUpdated((data) => {
      console.log("data", data);
      if (data.paymentStatus !== 30) return;

      message.success("Thanh toán thành công! Đang cập nhật dữ liệu...");
      handlePrint(Number(data.orderId));
      setSelectedSeats([]);
      queryClient.invalidateQueries({
        queryKey: planScreeningsKeys.getDetail(planScreenId)
      });
      setOpenQrDialog(false);
      window.api?.sendQrClose();
    });

    return cleanup;
  }, [handlePrint, planScreenId, queryClient, setSelectedSeats]);

  const totalPrice = useMemo(
    () => selectedSeats.reduce((acc, cur) => acc + cur.price, 0),
    [selectedSeats]
  );

  const onBooking = (memberCardCode?: string) => {
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
      memberCardCode
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
            const responseQr = await createQr.mutateAsync({
              orderId: order.id,
              paymentMethod: paymentMethod[0],
              shortName: "M11"
            });

            const body: QrDialogData = {
              ...responseQr,
              orderId: order.id,
              orderTotal: order.orderTotal,
              orderDiscount: order.orderDiscount,
              createdOnUtc: order.createdOnUtc,
              filmName: data.filmInfo.filmName,
              roomName: data.roomInfo.name,
              projectDate: data.projectDate,
              projectTime: data.projectTime,
              seats: selectedSeats.map((seat) => seat.code).join(", ")
            };

            setQrData(body);
            setOpenQrDialog(true);
            window.api.sendQrOpen(body);
          } catch {
            onCancelOrder([order.id]);
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

        handlePrint(order.id);
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

  const onCancelSeats = (cancelReasonId?: number) => {
    const floorNo = selectedSeats[0]?.floor || 1;

    const body: CancelOrderDto = {
      planScreenId,
      cancelReasonId: cancelReasonId || 1,
      isRefund: true
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
        setOpenCancelSeats(false);
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

  const disableActions = createOrder.isPending || cancelOrder.isPending;

  return (
    <div
      className={cn(
        "bg-jiren dark:bg-app-bg border-t border-gray-300 dark:border-app-border shrink-0 px-2",
        isCustomerView && "hidden"
      )}
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
            onClick={() => setOpenCancelSeats(true)}
          >
            Huỷ vé
          </Button>
          <Modal
            title="Xác nhận hủy vé"
            open={openCancelSeats}
            onOk={() => {
              form.submit();
            }}
            onCancel={() => setOpenCancelSeats(false)}
            okButtonProps={{
              loading: cancelOrder.isPending
            }}
            cancelButtonProps={{
              disabled: cancelOrder.isPending
            }}
            modalRender={(dom) => (
              <Form<FieldType>
                form={form}
                name="basic"
                style={{ maxWidth: 600 }}
                onFinish={(values) => {
                  onCancelSeats(values.cancelReasonId);
                }}
                autoComplete="off"
                layout="vertical"
              >
                {dom}
              </Form>
            )}
          >
            <Form.Item<FieldType>
              name="cancelReasonId"
              label="Lý do hủy vé"
              rules={[{ required: true, message: "Chọn lý do hủy vé" }]}
            >
              <Select
                loading={isFetching || isFetchingNextPage}
                options={options}
                placeholder="Chọn lý do hủy vé"
                onPopupScroll={(e) => {
                  const target = e.target as HTMLElement;
                  if (
                    hasNextPage &&
                    !isFetchingNextPage &&
                    target.scrollHeight - target.scrollTop <= target.clientHeight + 50
                  ) {
                    fetchNextPage();
                  }
                }}
                allowClear
              />
            </Form.Item>
          </Modal>
        </div>
        <div className="flex-1 max-w-120 bg-app-bg-container py-2 px-4 rounded-md">
          <Descriptions size="small" items={items} column={2} />
        </div>
        <div className="text-xs">
          <p className="text-gray-500">Tiền vừa bán:</p>
          <p className="font-bold text-red-500 text-sm">{formatMoney(Number(lastTotal) || 0)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div></div>
          <Button variant="outlined" color="pink" disabled={disableActions}>
            Đổi quà
          </Button>
          <Button
            variant="outlined"
            color="green"
            disabled={disableActions}
            onClick={onReserveSeats}
          >
            Giữ chỗ
          </Button>
          <Button
            variant="outlined"
            danger
            disabled={disableActions}
            onClick={() => onCancelSeats()}
          >
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
          onCancel={() => {
            onCancelOrder([qrData.orderId]);
            setOpenQrDialog(false);
            window.api?.sendQrClose();
          }}
          dataQr={qrData}
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
