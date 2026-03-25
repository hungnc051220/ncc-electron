import { SetSeatsContractTicketSaleDto } from "@renderer/api/contractTicketSales.api";
import { CancelOrderDto, OrderDto, ordersApi } from "@renderer/api/orders.api";
import { cancellationReasonsApi } from "@renderer/api/cancellationReasons.api";
import { contractTicketSalesKeys } from "@renderer/hooks/contractTicketSales/keys";
import { useSetSeatsContractTicketSale } from "@renderer/hooks/contractTicketSales/useSetSeatsContractTicketSale";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { useCancelOrder } from "@renderer/hooks/orders/useCancelOrder";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { getPrintErrorMessage } from "@renderer/lib/print";
import { buildTicketsFromOrder, formatMoney, isPlanScreeningLocked } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { useAuthStore } from "@renderer/store/auth.store";
import { usePrinterStore } from "@renderer/store/printer.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import { ApiError, ListSeat, PlanScreeningDetailProps } from "@shared/types";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { DescriptionsProps } from "antd";
import { Button, Descriptions, Form, Modal, Select, message } from "antd";
import axios from "axios";
import { Dispatch, SetStateAction, useCallback, useMemo, useState } from "react";

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
  contractOrderId: number;
  planScreeningId: number;
  selectedSeats: ListSeat[];
  setSelectedSeats: Dispatch<SetStateAction<ListSeat[]>>;
}

type FieldType = {
  cancelReasonId: number;
};

const Actions = ({
  data,
  contractOrderId,
  planScreeningId,
  selectedSeats,
  setSelectedSeats
}: ActionsProps) => {
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
  const cancelOrder = useCancelOrder();
  const isPlanScreeningPast = isPlanScreeningLocked(data.projectDate, data.projectTime);
  const [openCancelSeats, setOpenCancelSeats] = useState(false);

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
    },
    [posName, printMessageKey, queryClient, selectedPrinter, user]
  );

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
          queryClient.refetchQueries({
            queryKey: contractTicketSalesKeys.all
          });
        },
        onError: (error: unknown) => {
          let msg = "Thiết lập ghế hợp đồng thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
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

    const body: CancelOrderDto = {
      planScreenId: planScreeningId,
      cancelReasonId: values.cancelReasonId,
      ...selectedSeatIndicesByFloor
    };

    cancelOrder.mutate(body, {
      onSuccess: () => {
        setSelectedSeats([]);
        setOpenCancelSeats(false);
        queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreeningId) });
        message.success("Huỷ vé hợp đồng thành công");
      },
      onError: (error: unknown) => {
        let msg = "Huỷ vé hợp đồng thất bại";

        if (axios.isAxiosError<ApiError>(error)) {
          msg = error.response?.data?.message ?? msg;
        }

        message.error(msg);
      }
    });
  };

  return (
    <div className="bg-beerus dark:bg-app-bg border-t border-gray-300 dark:border-app-border shrink-0 px-4">
      <div className="p-2 flex gap-6 max-w-5xl mx-auto">
        <div className="flex-1 bg-app-bg-container py-2 px-4 rounded-md">
          <Descriptions size="small" items={items} column={2} />
        </div>
        <div className="flex gap-3">
          {canUpdate && (
            <Button
              variant="outlined"
              color="primary"
              className="h-full! font-bold"
              onClick={onUpdateSeat}
              disabled={
                selectedSeats.length === 0 ||
                setSeatsContractTicketSale.isPending ||
                isPlanScreeningPast
              }
            >
              Thêm vé hợp đồng
            </Button>
          )}

          {canDelete && (
            <Button
              variant="outlined"
              color="danger"
              className="h-full! font-bold"
              disabled={
                selectedSeats.length === 0 ||
                setSeatsContractTicketSale.isPending ||
                isPlanScreeningPast
              }
              onClick={() => setOpenCancelSeats(true)}
            >
              Hủy vé hợp đồng
            </Button>
          )}

          {canPrint && (
            <Button
              variant="outlined"
              color="orange"
              className="h-full! font-bold"
              onClick={() => handlePrint(contractOrderId)}
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
            onFinish={onCancelSeats}
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
