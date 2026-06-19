import { CancelOrderDto, OrderDto, ordersApi } from "@renderer/api/orders.api";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { cancellationReasonsApi } from "@renderer/api/cancellationReasons.api";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { useCancelOrder } from "@renderer/hooks/orders/useCancelOrder";
import { useCreateOrder } from "@renderer/hooks/orders/useCreateOrder";
import { useOrdersByScreening } from "@renderer/hooks/orders/useOrdersByScreening";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { formatMoney, isPlanScreeningLocked } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { useAuthStore } from "@renderer/store/auth.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import { ListSeat, OrderDetailProps, PlanScreeningDetailProps } from "@shared/types";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Form, Input, Modal, Select } from "antd";
import { CirclePlus, FileText, TimerOff, TicketX } from "lucide-react";
import { ChangeEvent, Dispatch, SetStateAction, useCallback, useMemo, useState } from "react";
import PrintInvitationTicketDialog from "./PrintInvitationTicketDialog";
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
  planScreeningId: number;
  selectedSeats: ListSeat[];
  setSelectedSeats: Dispatch<SetStateAction<ListSeat[]>>;
}

type FieldType = {
  cancelReasonId: number;
};

const Actions = ({ data, planScreeningId, selectedSeats, setSelectedSeats }: ActionsProps) => {
  const { message } = useAntdApp();

  const [cancelForm] = Form.useForm<FieldType>();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const { data: user } = useUserDetail(userId!);
  const { posName, posShortName } = useSettingPosStore();
  const { can } = usePermission();
  const canCreate = can("invitation_tickets", "create");
  const canDelete = can("invitation_tickets", "delete");
  const canPrint = can("invitation_tickets", "print");

  const [dialogPrintOpen, setDialogPrintOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderDetailProps | null>(null);
  const [note, setNote] = useState("");
  const [openCancelSeats, setOpenCancelSeats] = useState(false);
  const [isCancelReservePending, setIsCancelReservePending] = useState(false);

  const handleDialogPrintClose = useCallback((open: boolean) => {
    setDialogPrintOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleNoteModalClose = useCallback(() => {
    setNoteModalOpen(false);
  }, []);

  const createOrder = useCreateOrder();
  const cancelOrder = useCancelOrder();
  const { data: screeningOrders } = useOrdersByScreening(planScreeningId);
  const isPlanScreeningPast = isPlanScreeningLocked(data.projectDate, data.projectTime);

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

  const selectedSeatText = useMemo(
    () => selectedSeats.map((seat) => seat.code).join(", "),
    [selectedSeats]
  );

  const openNoteModal = () => {
    setNoteModalOpen(true);
  };

  const handleNoteChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
  };

  const onBooking = () => {
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
      planScreenId: planScreeningId,
      floorNo,
      isInvitation: true,
      paymentMethodSystemName: "POS",
      posName,
      posShortName,
      note,
      ...buildSeatFieldsByFloor(selectedSeats)
    };

    createOrder.mutate(body, {
      onSuccess: async (data) => {
        const { id } = data;
        message.success("Tạo vé mời thành công");
        if (canPrint) {
          try {
            const res = await ordersApi.getDetail(id);
            setSelectedItem(res);
            setDialogPrintOpen(true);
          } catch (error) {
            message.error(getApiErrorMessage(error, "Lấy thông tin vé mời thất bại"));
          }
        }
        setSelectedSeats([]);
        queryClient.invalidateQueries({
          queryKey: planScreeningsKeys.getDetail(planScreeningId)
        });
        queryClient.invalidateQueries({
          queryKey: ordersKeys.getOrdersByScreening(planScreeningId)
        });
        queryClient.refetchQueries({
          queryKey: ordersKeys.all
        });
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Tạo vé mời thất bại"));
      }
    });
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
        cancelForm.resetFields();
        queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreeningId) });
        queryClient.invalidateQueries({
          queryKey: ordersKeys.getOrdersByScreening(planScreeningId)
        });
        message.success("Hủy vé mời thành công");
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Hủy vé mời thất bại"));
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreeningId) }),
        queryClient.invalidateQueries({
          queryKey: ordersKeys.getOrdersByScreening(planScreeningId)
        })
      ]);
      queryClient.refetchQueries({
        queryKey: ordersKeys.all
      });
      message.success("Hủy giữ chỗ thành công");
    } catch (error) {
      message.error(getApiErrorMessage(error, "Hủy giữ chỗ thất bại"));
    } finally {
      setIsCancelReservePending(false);
    }
  };

  const disableActions =
    selectedSeats.length === 0 ||
    createOrder.isPending ||
    isCancelReservePending ||
    isPlanScreeningPast;

  return (
    <div className="shrink-0 border-t border-emerald-900/20 bg-emerald-100/50 px-2 backdrop-blur-md dark:border-emerald-300/20 dark:bg-emerald-950/80">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(300px,1fr)_minmax(190px,240px)_auto] items-center gap-2 p-2">
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
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-300">Ghi chú</p>
          <Button
            className="h-9 w-full justify-start overflow-hidden border-slate-200 bg-white/80 text-left dark:border-white/12 dark:bg-white/6"
            icon={<FileText size={15} />}
            onClick={openNoteModal}
          >
            <span className="truncate">{note.trim() ? note : "Nhập ghi chú"}</span>
          </Button>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/35">
          {canCreate && (
            <Button
              type="primary"
              className="h-9 min-w-[104px] px-3 font-semibold"
              icon={<CirclePlus size={15} />}
              onClick={onBooking}
              disabled={disableActions}
            >
              Thêm vé mời
            </Button>
          )}

          {canDelete && (
            <>
              <Button
                variant="outlined"
                color="orange"
                className="h-9 min-w-[88px] border-amber-300 px-3 text-amber-700 hover:!border-amber-400 hover:!text-amber-700 dark:border-amber-500/40 dark:text-amber-200 dark:hover:!border-amber-400 dark:hover:!text-amber-100"
                icon={<TimerOff size={15} />}
                disabled={disableActions}
                onClick={() => void onCancelReserve()}
              >
                Hủy giữ
              </Button>
              <Button
                variant="outlined"
                color="danger"
                className="h-9 min-w-[104px] px-3 font-semibold"
                icon={<TicketX size={15} />}
                disabled={disableActions}
                onClick={() => setOpenCancelSeats(true)}
              >
                Hủy vé mời
              </Button>
            </>
          )}
        </div>
      </div>

      {dialogPrintOpen && selectedItem && (
        <PrintInvitationTicketDialog
          open={dialogPrintOpen}
          onOpenChange={handleDialogPrintClose}
          selectedItem={selectedItem}
        />
      )}

      <Modal
        title="Xác nhận hủy vé"
        open={openCancelSeats}
        onOk={() => {
          cancelForm.submit();
        }}
        onCancel={() => {
          setOpenCancelSeats(false);
          cancelForm.resetFields();
        }}
        okButtonProps={{
          loading: cancelOrder.isPending
        }}
        cancelButtonProps={{
          disabled: cancelOrder.isPending
        }}
        forceRender
        modalRender={(dom) => (
          <Form<FieldType>
            form={cancelForm}
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

      <Modal
        open={noteModalOpen}
        title="Nhập ghi chú"
        onOk={handleNoteModalClose}
        onCancel={handleNoteModalClose}
        okText="Xong"
        cancelText="Đóng"
        width={680}
        style={{ top: 20 }}
      >
        <div className="space-y-3">
          <Input.TextArea
            value={note}
            rows={5}
            placeholder="Nhập ghi chú vé mời"
            onChange={handleNoteChange}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Actions;
