import { CancelOrderDto, OrderDto, ordersApi } from "@renderer/api/orders.api";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import ticketIcon from "@renderer/assets/icons/confirmation_number.svg";
import { useDiscounts } from "@renderer/hooks/discounts/useDiscounts";
import { useCancelOrder } from "@renderer/hooks/orders/useCancelOrder";
import { useCreateOrder } from "@renderer/hooks/orders/useCreateOrder";
import { useCreateQrOrder } from "@renderer/hooks/orders/useCreateQrOrder";
import { useOrdersByScreening } from "@renderer/hooks/orders/useOrdersByScreening";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import { buildTicketsFromOrder, cn, formatMoney, isPlanScreeningLocked } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { usePrinterStore } from "@renderer/store/printer.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import {
  DiscountProps,
  ListSeat,
  PaymentStatus,
  OrderResponseProps,
  PaymentType,
  PlanScreeningDetailProps,
  QrDialogData,
  OrderStatus
} from "@shared/types";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { DescriptionsProps, GetProp } from "antd";
import { Button, Checkbox, Descriptions, Form, Modal, Select } from "antd";
import { cancellationReasonsApi } from "@renderer/api/cancellationReasons.api";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { getPrintErrorMessage } from "@renderer/lib/print";
import { onOrderPaymentUpdated } from "@renderer/socket/socket";
import { useAuthStore } from "@renderer/store/auth.store";
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import DiscountPopup from "./DiscountPopup";
import InvoiceDialog from "../../invoices/components/InvoiceDialog";
import QrCodeDialog from "./QrCodeDialog";
import VipCardDialog from "./VipCardDialog";
import { useUpdateOrder } from "@renderer/hooks/orders/useUpdateOrder";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

export const paymentTypes = [
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
  isRefund: boolean;
};

export const getSeatDiscountKey = (seat: ListSeat) => `${seat.floor}-${seat.seat}`;

export const buildSeatFieldsByFloor = (selectedSeats: ListSeat[]) => {
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

export const calculateSeatDiscount = (seat: ListSeat, discount?: DiscountProps) => {
  if (!discount) return 0;

  const maxDiscount = seat.price || 0;

  if (discount.discountRate) {
    return Math.min((seat.price * discount.discountRate) / 100, maxDiscount);
  }

  return Math.min(discount.discountAmount || 0, maxDiscount);
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
  const { message } = useAntdApp();

  const printMessageKey = "plan-screening-print";
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
  const [lastSaleTotal, setLastSaleTotal] = useState(
    () => Number(sessionStorage.getItem("lastTotal")) || 0
  );
  const [isCheckingQrTransaction, setIsCheckingQrTransaction] = useState(false);

  const userId = useAuthStore((s) => s.userId);
  const { data: user } = useUserDetail(userId!);
  const { can } = usePermission();
  const canCreate = can("showtimes", "create");
  const canUpdate = can("showtimes", "update");
  const canPrint = can("showtimes", "print");
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
  const updateOrder = useUpdateOrder();
  const { data: screeningOrders } = useOrdersByScreening(planScreenId);
  const isPlanScreeningPast = isPlanScreeningLocked(data.projectDate, data.projectTime);
  const [isCancelReservePending, setIsCancelReservePending] = useState(false);

  const syncLastSaleTotal = useCallback((total: number) => {
    sessionStorage.setItem("lastTotal", total.toString());
    setLastSaleTotal(total);
  }, []);

  const handlePrint = useCallback(
    async (orderId: number) => {
      try {
        message.loading({
          key: printMessageKey,
          content: "Đang in vé..."
        });

        const orderDetail = await queryClient.fetchQuery({
          queryKey: ordersKeys.getDetail(orderId),
          queryFn: () => ordersApi.getDetail(orderId)
        });

        const tickets = await buildTicketsFromOrder(orderDetail, user?.fullname, posName);

        await window.api?.printTickets(tickets, selectedPrinter);
      } catch (error) {
        console.error(error);
        message.error({
          key: printMessageKey,
          content: getPrintErrorMessage(error),
          duration: 4
        });
        return;
      }

      try {
        await ordersApi.markPrinted({
          orderId,
          posShortName
        });
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: planScreeningsKeys.getDetail(planScreenId)
          }),
          queryClient.invalidateQueries({
            queryKey: ordersKeys.getOrdersByScreening(planScreenId)
          }),
          queryClient.invalidateQueries({
            queryKey: ordersKeys.getDetail(orderId)
          })
        ]);

        message.success({
          key: printMessageKey,
          content: "In vé thành công"
        });
      } catch (error) {
        console.error(error);
        message.error({
          key: printMessageKey,
          content: getApiErrorMessage(error, "Cập nhật trạng thái in vé thất bại"),
          duration: 4
        });
      }
    },
    [message, planScreenId, queryClient, selectedPrinter, user, posName, posShortName]
  );

  const handleQrPaymentSuccess = useCallback(
    (orderId: number, orderTotal: number) => {
      syncLastSaleTotal(orderTotal);
      message.success("Thanh toán thành công! Đang cập nhật dữ liệu...");
      if (canPrint) {
        void handlePrint(orderId);
      }
      setSelectedSeats([]);
      setSelectedDiscountGroups({});
      queryClient.invalidateQueries({
        queryKey: planScreeningsKeys.getDetail(planScreenId)
      });
      queryClient.invalidateQueries({
        queryKey: ordersKeys.getOrdersByScreening(planScreenId)
      });
      setOpenQrDialog(false);
      window.api?.sendQrClose();
    },
    [canPrint, handlePrint, message, planScreenId, queryClient, setSelectedSeats, syncLastSaleTotal]
  );

  useEffect(() => {
    const cleanup = onOrderPaymentUpdated((data) => {
      if (data.paymentStatus !== 30) return;

      if (qrData && String(qrData.orderId) === String(data.orderId)) {
        handleQrPaymentSuccess(Number(data.orderId), qrData.orderTotal);
        return;
      }
    });

    return cleanup;
  }, [handleQrPaymentSuccess, qrData, queryClient]);

  const totalPrice = useMemo(
    () => selectedSeats.reduce((acc, cur) => acc + cur.price, 0),
    [selectedSeats]
  );

  useEffect(() => {
    const allowedKeys = new Set(selectedSeats.map((seat) => getSeatDiscountKey(seat)));

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

  const onBooking = (params?: {
    customerId?: number;
    memberCardCode?: string;
    voucherCode?: string;
  }) => {
    if (isPlanScreeningPast) {
      message.error("Ca chiếu đã qua, không thể thao tác");
      return;
    }

    if (!posName || !posShortName) {
      message.error("Chưa cấu hình máy POS, không thể thao tác");
      return;
    }

    const floorNo = selectedSeats[0]?.floor || 1;

    const body: OrderDto = {
      planScreenId,
      floorNo,
      paymentMethodSystemName: paymentMethod.length > 0 ? paymentMethod[0] : "POS",
      posName,
      posShortName,
      isInvitation: false,
      customerId: params?.customerId,
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
              shortName: posShortName
            });

            const body: QrDialogData = {
              ...responseQr,
              orderId: order.id,
              orderTotal: order.orderTotal,
              orderDiscount: order.orderDiscount,
              paymentMethodSystemName: order.paymentMethodSystemName,
              voucherCode: order.voucherCode,
              createdOnUtc: order.createdOnUtc,
              filmName: data.filmInfo.filmName,
              roomName: data.roomInfo.name,
              projectDate: data.projectDate,
              projectTime: data.projectTime,
              orderStatusId: order.orderStatusId,
              paymentStatusId: order.paymentStatusId,
              shippingStatusId: order.shippingStatusId,
              seats: selectedSeats.map((seat) => seat.code).join(", ")
            };

            setQrData(body);
            setOpenQrDialog(true);
            window.api.sendQrOpen(body);
          } catch {
            onUpdateOrder(order.id, order.shippingStatusId, order.paymentStatusId, "QR_FAILED");
          }
          return;
        }

        syncLastSaleTotal(order.orderTotal);
        message.success("Tạo đơn thành công");
        setSelectedSeats([]);
        setSelectedDiscountGroups({});
        queryClient.invalidateQueries({
          queryKey: planScreeningsKeys.getDetail(planScreenId)
        });
        queryClient.invalidateQueries({ queryKey: ordersKeys.getOrdersByScreening(planScreenId) });
        if (canPrint) {
          handlePrint(order.id);
        }

        if (exportInvoice && canUpdate) {
          setInvoiceOrderId(order.id);
          setOpenInvoiceDialog(true);
        }
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Tạo đơn thất bại"));
      }
    });
  };

  const onReserveSeats = () => {
    if (isPlanScreeningPast) {
      message.error("Ca chiếu đã qua, không thể thao tác");
      return;
    }

    if (!posName || !posShortName) {
      message.error("Chưa cấu hình máy POS, không thể thao tác");
      return;
    }

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
        message.error(getApiErrorMessage(error, "Giữ chỗ thất bại"));
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
      children: (
        <p className="text-right flex-1 font-bold text-xs self-center">{selectedSeats.length}</p>
      )
    },
    {
      key: "2",
      label: <span className="text-xs font-semibold">Tiền vé</span>,
      children: (
        <p className="text-right flex-1 font-bold text-xs self-center">{formatMoney(totalPrice)}</p>
      )
    },
    {
      key: "3",
      label: <span className="text-xs font-semibold">Giảm giá</span>,
      children: (
        <p
          onClick={() => setOpenDiscount(true)}
          className="text-right flex-1 font-bold cursor-pointer text-xs self-center"
        >
          {priceDiscount > 0 || Object.keys(selectedDiscountGroups).length > 0
            ? formatMoney(priceDiscount)
            : "Chọn giảm giá"}
        </p>
      )
    },
    {
      key: "4",
      label: <span className="text-xs font-semibold">Thành tiền</span>,
      children: (
        <p className="text-right flex-1 font-bold text-blue-600 self-center">
          {formatMoney(totalPrice - priceDiscount)}
        </p>
      )
    }
  ];

  const onChange: GetProp<typeof Checkbox.Group, "onChange"> = (checkedValues) => {
    const last = checkedValues.slice(-1) as string[];
    setPaymentMethod(last);
  };

  const onUpdateOrder = (
    orderId: number,
    shippingStatusId: number,
    paymentStatusId: number,
    error: "PAYMENT_FAILED" | "QR_FAILED"
  ) => {
    updateOrder.mutate(
      {
        id: orderId,
        dto: {
          orderStatusId: OrderStatus.FAIL,
          shippingStatusId: shippingStatusId,
          paymentStatusId: paymentStatusId
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreenId) });
          queryClient.invalidateQueries({
            queryKey: ordersKeys.getOrdersByScreening(planScreenId)
          });
          const errorMessage =
            error === "PAYMENT_FAILED"
              ? "Đơn đã được kết thúc do thanh toán không thành công"
              : "Đơn đã được kết thúc do tạo QR thất bại";
          message.error(errorMessage);
        },
        onError: (error: unknown) => {
          message.error(getApiErrorMessage(error, "Chuyển trạng thái đơn thất bại"));
        }
      }
    );
  };

  const onCheckQrTransaction = async () => {
    if (!qrData) return;

    try {
      setIsCheckingQrTransaction(true);
      await ordersApi.checkTransaction({ orderId: qrData.orderId });

      const orderDetail = await queryClient.fetchQuery({
        queryKey: ordersKeys.getDetail(qrData.orderId),
        queryFn: () => ordersApi.getDetail(qrData.orderId)
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: planScreeningsKeys.getDetail(planScreenId)
        }),
        queryClient.invalidateQueries({
          queryKey: ordersKeys.getOrdersByScreening(planScreenId)
        })
      ]);

      if (orderDetail.order.paymentStatusId === PaymentStatus.PAID) {
        handleQrPaymentSuccess(qrData.orderId, qrData.orderTotal);
        return;
      }

      message.warning("Giao dịch chưa được ghi nhận thành công. Vui lòng kiểm tra lại.");
    } catch {
      message.error("Kiểm tra lại giao dịch thanh toán thất bại");
    } finally {
      setIsCheckingQrTransaction(false);
    }
  };

  const onCancelSeats = (values?: FieldType) => {
    if (isPlanScreeningPast) {
      message.error("Ca chiếu đã qua, không thể thao tác");
      return;
    }

    const selectedSeatIndicesByFloor = {
      listChairIndexF1: selectedSeats.filter((seat) => seat.floor === 1).map((seat) => seat.seat),
      listChairIndexF2: selectedSeats.filter((seat) => seat.floor === 2).map((seat) => seat.seat),
      listChairIndexF3: selectedSeats.filter((seat) => seat.floor === 3).map((seat) => seat.seat)
    };

    const body: CancelOrderDto = {
      planScreenId,
      cancelReasonId: values?.cancelReasonId || 1,
      isRefund: values?.isRefund || false,
      ...selectedSeatIndicesByFloor
    };

    cancelOrder.mutate(body, {
      onSuccess: () => {
        setSelectedSeats([]);
        setOpenCancelSeats(false);
        queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreenId) });
        queryClient.invalidateQueries({ queryKey: ordersKeys.getOrdersByScreening(planScreenId) });
        message.success("Hủy vé thành công");
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Hủy vé thất bại"));
      }
    });
  };

  const onCancelReserve = async () => {
    if (isPlanScreeningPast) {
      message.error("Ca chiếu đã qua, không thể thao tác");
      return;
    }

    const selectedSeatCodes = new Set(
      selectedSeats.map((seat) => `${seat.floor}-${seat.code.trim().toUpperCase()}`)
    );
    const orderIds = Array.from(
      new Set(
        (screeningOrders || [])
          .filter((order) =>
            order.items.some((item) =>
              [item.listChairValueF1, item.listChairValueF2, item.listChairValueF3].some(
                (seatValues, floorIndex) =>
                  (seatValues || "")
                    .split(",")
                    .map((seat) => seat.trim())
                    .filter(Boolean)
                    .some((seatCode) =>
                      selectedSeatCodes.has(`${floorIndex + 1}-${seatCode.toUpperCase()}`)
                    )
              )
            )
          )
          .map((order) => order.id)
      )
    );

    if (orderIds.length === 0) {
      message.error("Không xác định được đơn giữ chỗ của các ghế đã chọn");
      return;
    }

    setIsCancelReservePending(true);

    try {
      await ordersApi.cancelReserve({
        listChairIndexF1: selectedSeats.filter((seat) => seat.floor === 1).map((seat) => seat.seat),
        listChairIndexF2: selectedSeats.filter((seat) => seat.floor === 2).map((seat) => seat.seat),
        listChairIndexF3: selectedSeats.filter((seat) => seat.floor === 3).map((seat) => seat.seat),
        orderIds
      });

      setSelectedSeats([]);
      setSelectedDiscountGroups({});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreenId) }),
        queryClient.invalidateQueries({ queryKey: ordersKeys.getOrdersByScreening(planScreenId) })
      ]);
      message.success("Hủy giữ chỗ thành công");
    } catch (error) {
      message.error(getApiErrorMessage(error, "Hủy giữ chỗ thất bại"));
    } finally {
      setIsCancelReservePending(false);
    }
  };

  const disableActions =
    createOrder.isPending ||
    cancelOrder.isPending ||
    isCancelReservePending ||
    isPlanScreeningPast ||
    updateOrder.isPending;

  return (
    <div
      className={cn(
        "shrink-0 border-t border-emerald-900/20 bg-emerald-100/50 px-2 backdrop-blur-md dark:border-emerald-300/20 dark:bg-emerald-950/80",
        isCustomerView && "hidden"
      )}
    >
      <div className="p-2 flex gap-2 items-center justify-center">
        <div className="flex flex-col gap-2">
          <Checkbox checked={cancelMode} onChange={(e) => setCancelMode(e.target.checked)}>
            Hủy vé
          </Checkbox>
          <Button
            variant="outlined"
            color="danger"
            disabled={
              !canUpdate || !cancelMode || selectedSeats.length === 0 || isPlanScreeningPast
            }
            onClick={() => setOpenCancelSeats(true)}
          >
            Hủy vé
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
                  onCancelSeats(values);
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

            <Form.Item<FieldType> name="isRefund" valuePropName="checked">
              <Checkbox>Hủy vé hoàn tiền</Checkbox>
            </Form.Item>
          </Modal>
        </div>
        <div className="flex-1 max-w-120 rounded-md bg-white px-4 py-2 backdrop-blur-md dark:bg-emerald-950/28">
          <Descriptions size="small" items={items} column={2} />
        </div>
        <div className="text-xs">
          <Checkbox
            className="mt-1"
            checked={exportInvoice}
            disabled={!canUpdate || isPlanScreeningPast}
            onChange={(e) => setExportInvoice(e.target.checked)}
          >
            <span className="text-xs">Xuất hóa đơn</span>
          </Checkbox>
          <p className="text-slate-500 dark:text-slate-300">Tiền vừa bán:</p>
          <p className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
            {formatMoney(lastSaleTotal)}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          <Button
            variant="outlined"
            color="green"
            disabled={disableActions || !canUpdate || selectedSeats.length === 0}
            onClick={onReserveSeats}
          >
            Giữ chỗ
          </Button>
          <Button
            variant="outlined"
            danger
            disabled={disableActions || !canUpdate || selectedSeats.length === 0}
            onClick={() => void onCancelReserve()}
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
          <div>
            <Button
              type="primary"
              size="large"
              className="flex flex-col w-full h-full gap-1"
              style={{ height: 72 }}
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
                cancelMode ||
                !canCreate ||
                isPlanScreeningPast
              }
            >
              <img src={ticketIcon} width={28} height={28} alt="icon" />
              <span className="text-base font-bold">In vé</span>
            </Button>
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
            onUpdateOrder(
              qrData.orderId,
              qrData.shippingStatusId,
              qrData.paymentStatusId,
              "PAYMENT_FAILED"
            );
            setOpenQrDialog(false);
            window.api?.sendQrClose();
          }}
          onCheckTransaction={() => void onCheckQrTransaction()}
          dataQr={qrData}
          isCheckingTransaction={isCheckingQrTransaction}
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
          hasSeatTypeDiscount={Object.keys(selectedDiscountGroups).length > 0}
          filmVersionCode={data.filmInfo.versionCode}
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
          enableVirtualKeyboardDrawer
        />
      )}
    </div>
  );
};

export default Actions;
