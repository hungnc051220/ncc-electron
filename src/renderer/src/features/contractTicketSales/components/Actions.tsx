import {
  CancelContactTicketSaleDto,
  SetSeatsContractTicketSaleDto
} from "@renderer/api/contractTicketSales.api";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { OrderDto } from "@renderer/api/orders.api";
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
import { ListSeat, OrderDetailProps, PlanScreeningDetailProps } from "@shared/types";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { DescriptionsProps } from "antd";
import { Button, Checkbox, Descriptions, Form, Modal, Select } from "antd";
import dayjs from "dayjs";
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
  const { posName } = useSettingPosStore();
  const selectedPrinter = usePrinterStore((s) => s.selectedPrinter);
  const { can } = usePermission();
  const canUpdate = can("contract_ticket_sales", "update");
  const canDelete = can("contract_ticket_sales", "delete");
  const canPrint = can("contract_ticket_sales", "print");

  const setSeatsContractTicketSale = useSetSeatsContractTicketSale();
  const cancelContractTicketSale = useCancelContractTicketSale();
  const [openCancelSeats, setOpenCancelSeats] = useState(false);

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

      message.success({
        key: printMessageKey,
        content: "In vé thành công"
      });
    } catch (error) {
      console.error(error);
      message.error({
        key: printMessageKey,
        content: getPrintErrorMessage(error),
        duration: 4
      });
    }
  }, [
    hasPrintableTickets,
    message,
    posName,
    printMessageKey,
    printableOrderDetail,
    selectedPrinter,
    user
  ]);

  const items: DescriptionsProps["items"] = [
    {
      key: "1",
      label: "Số vé",
      children: <p className="text-right flex-1 font-bold">{selectedSeats.length}</p>
    },
    {
      key: "2",
      label: "Tiền giá trị",
      children: <p className="text-right flex-1 font-bold">{formatMoney(totalPrice)}</p>
    },
    {
      key: "3",
      label: "Ghế đã chọn",
      children: (
        <p className="flex-1 text-right line-clamp-1 max-w-full">
          {selectedSeats.map((s) => s.code).join(", ")}
        </p>
      )
    },
    {
      key: "4",
      label: "Nhân viên xử lý",
      children: <p className="flex-1 text-right">{user?.fullname}</p>
    }
  ];

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

  return (
    <div className="shrink-0 border-t border-emerald-900/20 bg-emerald-100/50 px-2 backdrop-blur-md dark:border-emerald-300/20 dark:bg-emerald-950/80">
      <div className="p-2 flex gap-6 max-w-5xl mx-auto">
        <div className="flex-1 bg-app-bg-container py-2 px-4 rounded-md">
          <Descriptions size="small" items={items} column={2} />
        </div>
        <div className="flex gap-3">
          {canDelete && (
            <div className="flex flex-col gap-2">
              <Checkbox
                checked={cancelMode}
                onChange={(e) => setCancelMode(e.target.checked)}
                disabled={
                  setSeatsContractTicketSale.isPending ||
                  cancelContractTicketSale.isPending ||
                  isPlanScreeningPast
                }
              >
                Hủy vé
              </Checkbox>
              <Button
                variant="outlined"
                color="danger"
                className="font-bold"
                disabled={
                  !cancelMode ||
                  selectedSeats.length === 0 ||
                  setSeatsContractTicketSale.isPending ||
                  cancelContractTicketSale.isPending ||
                  isPlanScreeningPast
                }
                onClick={() => setOpenCancelSeats(true)}
              >
                Hủy vé hợp đồng
              </Button>
            </div>
          )}

          {canUpdate && (
            <Button
              variant="outlined"
              color="primary"
              className="h-full! font-bold"
              onClick={onUpdateSeat}
              disabled={
                selectedSeats.length === 0 ||
                setSeatsContractTicketSale.isPending ||
                cancelContractTicketSale.isPending ||
                cancelMode ||
                isPlanScreeningPast
              }
            >
              Thêm vé hợp đồng
            </Button>
          )}

          {canPrint && (
            <Button
              variant="outlined"
              color="orange"
              className="h-full! font-bold"
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
