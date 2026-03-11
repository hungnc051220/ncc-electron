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

import { cancellationReasonsApi } from "@renderer/api/cancellationReasons.api";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { onOrderPaymentUpdated } from "@renderer/socket/socket";
import { useAuthStore } from "@renderer/store/auth.store";
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import DiscountPopup from "./DiscountPopup";
import InvoiceDialog from "../../invoices/components/InvoiceDialog";
import QrCodeDialog from "./QrCodeDialog";
import VipCardDialog from "./VipCardDialog";

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

const getSeatDiscountKey = (seat: ListSeat) => `${seat.floor}-${seat.seat}`;

const buildSeatFieldsByFloor = (selectedSeats: ListSeat[]) => {
  const floors = [1, 2, 3] as const;

  return floors.reduce<
    Pick<
      OrderDto,
      | "listChairIndexF1"
      | "listChairValueF1"
      | "listChairIndexF2"
      | "listChairValueF2"
      | "listChairIndexF3"
      | "listChairValueF3"
    >
  >((acc, floor) => {
    const seatsByFloor = selectedSeats.filter((seat) => seat.floor === floor);

    if (seatsByFloor.length === 0) {
      return acc;
    }

    const indexKey = `listChairIndexF${floor}` as
      | "listChairIndexF1"
      | "listChairIndexF2"
      | "listChairIndexF3";
    const valueKey = `listChairValueF${floor}` as
      | "listChairValueF1"
      | "listChairValueF2"
      | "listChairValueF3";

    acc[indexKey] = seatsByFloor.map((seat) => seat.seat).join(",");
    acc[valueKey] = seatsByFloor.map((seat) => seat.code).join(",");

    return acc;
  }, {});
};

const calculateSeatDiscount = (seat: ListSeat, discount?: DiscountProps) => {
  if (!discount) return 0;

  if (discount.discountRate) {
    return (seat.price * discount.discountRate) / 100;
  }

  return discount.discountAmount || 0;
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
  const [selectedDiscountGroups, setSelectedDiscountGroups] = useState<
    Record<string, number | undefined>
  >({});
  const [paymentMethod, setPaymentMethod] = useState<string[]>([]);
  const [openQrDialog, setOpenQrDialog] = useState(false);
  const [openVipCardDialog, setOpenVipCardDialog] = useState(false);
  const [exportInvoice, setExportInvoice] = useState(false);
  const [openInvoiceDialog, setOpenInvoiceDialog] = useState(false);
  const [invoiceOrderId, setInvoiceOrderId] = useState<number | undefined>(undefined);
  const [qrData, setQrData] = useState<QrDialogData | undefined>(undefined);
  const [openCancelSeats, setOpenCancelSeats] = useState(false);

  const userId = useAuthStore((s) => s.userId);
  const { data: user } = useUserDetail(userId!);
  const { data: discounts } = useDiscounts({ current: 1, pageSize: 20 });
  const discountsById = useMemo(
    () => new Map((discounts?.data || []).map((discount) => [discount.id, discount])),
    [discounts]
  );

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
      if (data.paymentStatus !== 30) return;

      message.success("Thanh toán thành công! Đang cập nhật dữ liệu...");
      handlePrint(Number(data.orderId));
      setSelectedSeats([]);
      setSelectedDiscountGroups({});
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

  useEffect(() => {
    const allowedKeys = new Set(selectedSeats.map((seat) => getSeatDiscountKey(seat)));

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedDiscountGroups((prev) => {
      const nextEntries = Object.entries(prev).filter(
        ([key, discountId]) => allowedKeys.has(key) && discountId
      );

      if (nextEntries.length === Object.keys(prev).length) {
        return prev;
      }

      return Object.fromEntries(nextEntries);
    });
  }, [selectedSeats]);

  const discountGroupsPayload = useMemo(() => {
    if (selectedSeats.length === 0) return undefined;

    const grouped = new Map<number, string[]>();

    selectedSeats.forEach((seat) => {
      const seatKey = getSeatDiscountKey(seat);
      const discountId = selectedDiscountGroups[seatKey];

      if (!discountId) return;

      const current = grouped.get(discountId) || [];
      current.push(seat.seat);
      grouped.set(discountId, current);
    });

    if (grouped.size === 0) return undefined;

    return Array.from(grouped.entries()).map(([discountId, chairIndices]) => ({
      discountId,
      chairIndices
    }));
  }, [selectedDiscountGroups, selectedSeats]);

  const onBooking = (params?: { memberCardCode?: string; voucherCode?: string }) => {
    if (!posName || !posShortName) return;
    const floorNo = selectedSeats[0]?.floor || 1;

    const body: OrderDto = {
      planScreenId,
      floorNo,
      paymentMethodSystemName: paymentMethod.length > 0 ? paymentMethod[0] : "POS",
      posName,
      posShortName,
      isInvitation: false,
      memberCardCode: params?.memberCardCode,
      voucherCode: params?.voucherCode,
      discountGroups: discountGroupsPayload,
      ...buildSeatFieldsByFloor(selectedSeats)
    };

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
        setSelectedDiscountGroups({});
        queryClient.invalidateQueries({
          queryKey: planScreeningsKeys.getDetail(planScreenId)
        });
        queryClient.invalidateQueries({ queryKey: ordersKeys.getOrdersByScreening(planScreenId) });
        handlePrint(order.id);

        if (exportInvoice) {
          setInvoiceOrderId(order.id);
          setOpenInvoiceDialog(true);
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
      isInvitation: false,
      action: "RESERVE_SEAT",
      discountGroups: discountGroupsPayload,
      ...buildSeatFieldsByFloor(selectedSeats)
    };

    createOrder.mutate(body, {
      onSuccess: async () => {
        message.success("Giữ chỗ thành công");
        setSelectedSeats([]);
        setSelectedDiscountGroups({});
        queryClient.invalidateQueries({
          queryKey: planScreeningsKeys.getDetail(planScreenId)
        });
        queryClient.invalidateQueries({ queryKey: ordersKeys.getOrdersByScreening(planScreenId) });
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
    return selectedSeats.reduce((total, seat) => {
      const seatKey = getSeatDiscountKey(seat);
      const discountId = selectedDiscountGroups[seatKey];
      const discount = discountId ? discountsById.get(discountId) : undefined;

      return total + calculateSeatDiscount(seat, discount);
    }, 0);
  }, [discountsById, selectedDiscountGroups, selectedSeats]);

  const items: DescriptionsProps["items"] = [
    {
      key: "1",
      label: <span className="text-xs font-semibold">Số vé</span>,
      children: <p className="text-right text-sm flex-1 font-bold">{selectedSeats.length}</p>
    },
    {
      key: "2",
      label: <span className="text-xs font-semibold">Tiền vé</span>,
      children: <p className="text-right flex-1 font-bold">{formatMoney(totalPrice)}</p>
    },
    {
      key: "3",
      label: <span className="text-xs font-semibold">Giảm giá</span>,
      children: (
        <div className="flex items-center justify-end flex-1 gap-2">
          <p
            onClick={() => setOpenDiscount(true)}
            className="text-right flex-1 font-bold cursor-pointer"
          >
            {priceDiscount > 0 || Object.keys(selectedDiscountGroups).length > 0
              ? formatMoney(priceDiscount)
              : "Chọn giảm giá"}
          </p>
        </div>
      )
    },
    {
      key: "4",
      label: <span className="text-xs font-semibold">Thành tiền</span>,
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
          queryClient.invalidateQueries({
            queryKey: ordersKeys.getOrdersByScreening(planScreenId)
          });
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
    const body: CancelOrderDto = {
      planScreenId,
      cancelReasonId: cancelReasonId || 1,
      isRefund: true,
      ...buildSeatFieldsByFloor(selectedSeats)
    };

    cancelOrder.mutate(body, {
      onSuccess: () => {
        setSelectedSeats([]);
        setOpenCancelSeats(false);
        queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreenId) });
        queryClient.invalidateQueries({ queryKey: ordersKeys.getOrdersByScreening(planScreenId) });
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
          <div className="flex flex-col">
            <Button
              type="primary"
              size="large"
              className="flex w-full"
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
            <Checkbox
              className="mt-1"
              checked={exportInvoice}
              onChange={(e) => setExportInvoice(e.target.checked)}
            >
              <span className="text-xs">Xuất hóa đơn</span>
            </Checkbox>
          </div>
        </div>
      </div>

      <DiscountPopup
        data={discounts?.data}
        openDiscount={openDiscount}
        selectedSeats={selectedSeats}
        value={selectedDiscountGroups}
        setOpenDiscount={setOpenDiscount}
        onChange={setSelectedDiscountGroups}
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
          totalPrice={totalPrice - priceDiscount}
          onBooking={onBooking}
          planScreenId={planScreenId}
          selectedSeats={selectedSeats}
        />
      )}

      {openInvoiceDialog && invoiceOrderId && (
        <InvoiceDialog
          open={openInvoiceDialog}
          onOpenChange={(open) => {
            setOpenInvoiceDialog(open);
            if (!open) {
              setInvoiceOrderId(undefined);
            }
          }}
          orderId={invoiceOrderId}
        />
      )}
    </div>
  );
};

export default Actions;
