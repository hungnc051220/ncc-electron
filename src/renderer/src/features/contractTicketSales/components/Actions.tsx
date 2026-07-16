import {
  CancelContactTicketSaleDto,
  SetSeatsContractTicketSaleDto
} from "@renderer/api/contractTicketSales.api";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { OrderDto, ordersApi } from "@renderer/api/orders.api";
import { cancellationReasonsApi } from "@renderer/api/cancellationReasons.api";
import { contractTicketSalesKeys } from "@renderer/hooks/contractTicketSales/keys";
import { useCancelContractTicketSale } from "@renderer/hooks/contractTicketSales/useCancelContractTicketSale";
import { useSetSeatsContractTicketSale } from "@renderer/hooks/contractTicketSales/useSetSeatsContractTicketSale";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { getPrintErrorMessage } from "@renderer/lib/print";
import { buildTicketsFromOrder, extractSeatValues, formatMoney } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { useAuthStore } from "@renderer/store/auth.store";
import { usePrinterStore } from "@renderer/store/printer.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import {
  ListSeat,
  OrderDetailProps,
  OrderResponseProps,
  PlanScreeningDetailProps
} from "@shared/types";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Checkbox, Form, Modal, Select } from "antd";
import dayjs from "dayjs";
import { CirclePlus, Printer, TimerOff, TicketX } from "lucide-react";
import { Dispatch, SetStateAction, useCallback, useMemo, useState } from "react";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

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

interface ActionsProps {
  data: PlanScreeningDetailProps;
  orderDetail?: OrderDetailProps;
  screeningOrders: OrderResponseProps[];
  contractSeatKeys: string[];
  contractOrderId: number;
  planScreeningId: number;
  selectedSeats: ListSeat[];
  setSelectedSeats: Dispatch<SetStateAction<ListSeat[]>>;
  cancelMode: boolean;
  setCancelMode: Dispatch<SetStateAction<boolean>>;
}

type FieldType = {
  cancelReasonId: number;
};

const Actions = ({
  data,
  orderDetail,
  screeningOrders,
  contractSeatKeys,
  contractOrderId,
  planScreeningId,
  selectedSeats,
  setSelectedSeats,
  cancelMode,
  setCancelMode
}: ActionsProps) => {
  const { message } = useAntdApp();

  const printMessageKey = `contract-ticket-sales-print-${contractOrderId}`;
  const [form] = Form.useForm<FieldType>();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const { data: user } = useUserDetail(userId!);
  const { posName, posShortName } = useSettingPosStore();
  const selectedPrinter = usePrinterStore((s) => s.selectedPrinter);
  const { can } = usePermission();
  const canUpdate = can("contract_ticket_sales", "update");
  const canDelete = can("contract_ticket_sales", "delete");
  const canPrint = can("contract_ticket_sales", "print");

  const setSeatsContractTicketSale = useSetSeatsContractTicketSale();
  const cancelContractTicketSale = useCancelContractTicketSale();
  const [openCancelSeats, setOpenCancelSeats] = useState(false);
  const [isCancelReservePending, setIsCancelReservePending] = useState(false);

  const isPlanScreeningPast = useMemo(() => {
    if (!data.projectDate) {
      return false;
    }

    const lockAt = dayjs(data.projectDate, "YYYY-MM-DD").add(1, "day").startOf("day");
    return lockAt.isValid() ? !dayjs().isBefore(lockAt) : false;
  }, [data.projectDate]);

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

  const cancelReasonOptions = useMemo(() => {
    return (
      cancellationReasons?.pages.flatMap((page) =>
        page.data.map((item) => ({
          value: item.id,
          label: item.reason
        }))
      ) ?? []
    );
  }, [cancellationReasons]);

  const totalPrice = useMemo(
    () => selectedSeats.reduce((acc, cur) => acc + cur.price, 0),
    [selectedSeats]
  );

  const printableOrderDetail = useMemo<OrderDetailProps | undefined>(() => {
    if (!orderDetail?.order) {
      return undefined;
    }

    const filteredItems = orderDetail.order.items.filter(
      (item) => item.planScreenId === planScreeningId
    );

    if (filteredItems.length === 0) {
      return undefined;
    }

    const printablePlanDetail: OrderDetailProps = {
      order: {
        ...orderDetail.order,
        items: filteredItems
      },
      planScreening: data as OrderDetailProps["planScreening"],
      film: data.filmInfo as OrderDetailProps["film"],
      room: data.roomInfo as OrderDetailProps["room"],
      planDetails: []
    };

    return {
      ...printablePlanDetail,
      planDetails: [printablePlanDetail]
    };
  }, [data, orderDetail, planScreeningId]);

  const hasPrintableTickets = useMemo(
    () =>
      contractSeatKeys.length > 0 ||
      extractSeatValues(printableOrderDetail?.order?.items, data.listSeats).length > 0,
    [contractSeatKeys.length, data.listSeats, printableOrderDetail]
  );

  const handlePrint = useCallback(async () => {
    if (!printableOrderDetail || !hasPrintableTickets) {
      message.warning("Suất chiếu này chưa có vé để in");
      return;
    }

    try {
      message.loading({
        key: printMessageKey,
        content: "Đang in vé..."
      });

      const tickets = await buildTicketsFromOrder(printableOrderDetail, user?.fullname, posName);

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
        orderId: contractOrderId,
        posShortName
      });

      message.success({
        key: printMessageKey,
        content: "In vé thành công"
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreeningId) }),
        queryClient.invalidateQueries({
          queryKey: ordersKeys.getOrdersByScreening(planScreeningId)
        }),
        queryClient.invalidateQueries({ queryKey: ordersKeys.getDetail(contractOrderId) }),
        queryClient.invalidateQueries({ queryKey: contractTicketSalesKeys.all })
      ]);
    } catch (error) {
      console.error(error);
      message.error({
        key: printMessageKey,
        content: getApiErrorMessage(error, "Cập nhật trạng thái in vé thất bại"),
        duration: 4
      });
    }
  }, [
    contractOrderId,
    hasPrintableTickets,
    message,
    planScreeningId,
    posName,
    posShortName,
    printMessageKey,
    printableOrderDetail,
    queryClient,
    selectedPrinter,
    user
  ]);

  const selectedSeatText = useMemo(
    () => selectedSeats.map((seat) => seat.code).join(", "),
    [selectedSeats]
  );

  const onUpdateSeat = () => {
    if (isPlanScreeningPast) {
      message.error("Ca chiếu đã qua, không thể thao tác");
      return;
    }

    const floorNo = selectedSeats[0]?.floor || 1;
    const body: SetSeatsContractTicketSaleDto = {
      planScreenId: planScreeningId,
      floorNo,
      operation: 1,
      ...buildSeatFieldsByFloor(selectedSeats)
    };

    setSeatsContractTicketSale.mutate(
      { id: contractOrderId, dto: body },
      {
        onSuccess: async () => {
          message.success("Thiết lập ghế hợp đồng thành công");
          setSelectedSeats([]);
          queryClient.invalidateQueries({
            queryKey: planScreeningsKeys.getDetail(planScreeningId)
          });
          queryClient.invalidateQueries({
            queryKey: ordersKeys.getDetail(contractOrderId)
          });
          queryClient.refetchQueries({
            queryKey: contractTicketSalesKeys.all
          });
        },
        onError: (error: unknown) => {
          message.error(getApiErrorMessage(error, "Thiết lập ghế hợp đồng thất bại"));
        }
      }
    );
  };

  const onCancelSeats = (values: FieldType) => {
    if (isPlanScreeningPast) {
      message.error("Ca chiếu đã qua, không thể thao tác");
      return;
    }

    const selectedSeatIndicesByFloor = {
      listChairIndexF1: selectedSeats.filter((seat) => seat.floor === 1).map((seat) => seat.seat),
      listChairIndexF2: selectedSeats.filter((seat) => seat.floor === 2).map((seat) => seat.seat),
      listChairIndexF3: selectedSeats.filter((seat) => seat.floor === 3).map((seat) => seat.seat)
    };

    const cancelReasonMsg =
      cancelReasonOptions.find((item) => item.value === values.cancelReasonId)?.label?.toString() ??
      "";

    const body: CancelContactTicketSaleDto = {
      planScreenId: planScreeningId,
      orderId: contractOrderId,
      cancelReasonId: values.cancelReasonId,
      cancelReasonMsg,
      ...selectedSeatIndicesByFloor
    };

    cancelContractTicketSale.mutate(body, {
      onSuccess: () => {
        setSelectedSeats([]);
        setOpenCancelSeats(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreeningId) });
        queryClient.invalidateQueries({ queryKey: ordersKeys.getDetail(contractOrderId) });
        queryClient.invalidateQueries({ queryKey: contractTicketSalesKeys.all });
        message.success("Hủy vé hợp đồng thành công");
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Hủy vé hợp đồng thất bại"));
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
        screeningOrders
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreeningId) }),
        queryClient.invalidateQueries({
          queryKey: ordersKeys.getOrdersByScreening(planScreeningId)
        }),
        queryClient.invalidateQueries({ queryKey: ordersKeys.getDetail(contractOrderId) }),
        queryClient.invalidateQueries({ queryKey: contractTicketSalesKeys.all })
      ]);
      message.success("Hủy giữ chỗ thành công");
    } catch (error) {
      message.error(getApiErrorMessage(error, "Hủy giữ chỗ thất bại"));
    } finally {
      setIsCancelReservePending(false);
    }
  };

  const isMutating =
    setSeatsContractTicketSale.isPending ||
    cancelContractTicketSale.isPending ||
    isCancelReservePending;
  const disableSeatActions = selectedSeats.length === 0 || isMutating || isPlanScreeningPast;

  return (
    <div className="shrink-0 border-t border-emerald-900/20 bg-emerald-100/50 px-2 backdrop-blur-md dark:border-emerald-300/20 dark:bg-emerald-950/80">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(300px,1fr)_auto] items-center gap-2 p-2">
        <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-1 rounded-md border border-white/55 bg-white/85 px-3 py-2 text-sm shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/35">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="shrink-0 text-slate-500 dark:text-slate-300">Số vé</span>
            <span className="truncate font-bold text-slate-900 dark:text-slate-50">
              {selectedSeats.length}
            </span>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="shrink-0 text-slate-500 dark:text-slate-300">Giá trị</span>
            <span className="truncate font-bold text-slate-900 dark:text-slate-50">
              {formatMoney(totalPrice)}
            </span>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="shrink-0 text-slate-500 dark:text-slate-300">Ghế</span>
            <span className="truncate text-right font-semibold text-slate-700 dark:text-slate-100">
              {selectedSeatText || "-"}
            </span>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="shrink-0 text-slate-500 dark:text-slate-300">NV</span>
            <span className="truncate text-right font-semibold text-slate-700 dark:text-slate-100">
              {user?.fullname || "-"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/35">
          {canDelete && (
            <>
              <Checkbox
                className="px-2 text-sm"
                checked={cancelMode}
                onChange={(e) => setCancelMode(e.target.checked)}
                disabled={isMutating || isPlanScreeningPast}
              >
                Hủy vé
              </Checkbox>
              <Button
                variant="outlined"
                color="danger"
                className="h-9 min-w-[126px] px-3 font-semibold"
                icon={<TicketX size={15} />}
                disabled={!cancelMode || disableSeatActions}
                onClick={() => setOpenCancelSeats(true)}
              >
                Hủy vé hợp đồng
              </Button>
            </>
          )}

          {canUpdate && (
            <Button
              type="primary"
              className="h-9 min-w-[132px] px-3 font-semibold"
              icon={<CirclePlus size={15} />}
              onClick={onUpdateSeat}
              disabled={cancelMode || disableSeatActions}
            >
              Thêm vé hợp đồng
            </Button>
          )}

          {canDelete && (
            <Button
              variant="outlined"
              color="orange"
              className="h-9 min-w-[88px] border-amber-300 px-3 text-amber-700 hover:!border-amber-400 hover:!text-amber-700 dark:border-amber-500/40 dark:text-amber-200 dark:hover:!border-amber-400 dark:hover:!text-amber-100"
              icon={<TimerOff size={15} />}
              disabled={cancelMode || disableSeatActions}
              onClick={() => void onCancelReserve()}
            >
              Hủy giữ
            </Button>
          )}

          {canPrint && (
            <Button
              variant="outlined"
              color="orange"
              className="h-9 min-w-[74px] px-3 font-semibold"
              icon={<Printer size={15} />}
              onClick={() => handlePrint()}
              disabled={!hasPrintableTickets}
            >
              In vé
            </Button>
          )}
        </div>
      </div>

      <Modal
        title="Xác nhận hủy vé"
        open={openCancelSeats}
        onOk={() => {
          form.submit();
        }}
        onCancel={() => {
          setOpenCancelSeats(false);
          form.resetFields();
        }}
        okButtonProps={{
          loading: cancelContractTicketSale.isPending
        }}
        cancelButtonProps={{
          disabled: cancelContractTicketSale.isPending
        }}
        forceRender
        modalRender={(dom) => (
          <Form<FieldType>
            form={form}
            onFinish={onCancelSeats}
            autoComplete="off"
            layout="vertical"
          >
            {dom}
          </Form>
        )}
        destroyOnHidden
      >
        <Form.Item<FieldType>
          name="cancelReasonId"
          label="Lý do hủy vé"
          rules={[{ required: true, message: "Chọn lý do hủy vé" }]}
        >
          <Select
            loading={isFetching || isFetchingNextPage}
            options={cancelReasonOptions}
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
  );
};

export default Actions;
