import { CancelOrderDto, OrderDto, ordersApi } from "@renderer/api/orders.api";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { useCancelOrder } from "@renderer/hooks/orders/useCancelOrder";
import { useCreateOrder } from "@renderer/hooks/orders/useCreateOrder";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { formatMoney, isPlanScreeningLocked } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { useAuthStore } from "@renderer/store/auth.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import { ApiError, ListSeat, OrderDetailProps, PlanScreeningDetailProps } from "@shared/types";
import { useQueryClient } from "@tanstack/react-query";
import type { DescriptionsProps } from "antd";
import { Button, Descriptions, Input, message } from "antd";
import axios from "axios";
import { Dispatch, SetStateAction, useCallback, useMemo, useState } from "react";
import PrintInvitationTicketDialog from "./PrintInvitationTicketDialog";

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

const Actions = ({ data, planScreeningId, selectedSeats, setSelectedSeats }: ActionsProps) => {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const { data: user } = useUserDetail(userId!);
  const { posName, posShortName } = useSettingPosStore();
  const { can } = usePermission();
  const canCreate = can("invitation_tickets", "create");
  const canDelete = can("invitation_tickets", "delete");
  const canPrint = can("invitation_tickets", "print");

  const [dialogPrintOpen, setDialogPrintOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderDetailProps | null>(null);
  const [note, setNote] = useState("");

  const handleDialogPrintClose = useCallback((open: boolean) => {
    setDialogPrintOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const createOrder = useCreateOrder();
  const cancelOrder = useCancelOrder();
  const isPlanScreeningPast = isPlanScreeningLocked(data.projectDate, data.projectTime);

  const totalPrice = useMemo(
    () => selectedSeats.reduce((acc, cur) => acc + cur.price, 0),
    [selectedSeats]
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

  const onBooking = () => {
    if (isPlanScreeningPast) {
      message.error("Ca chiếu đã qua, không thể thao tác");
      return;
    }

    if (!posName || !posShortName) return;

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
            console.log(error);
          }
        }
        setSelectedSeats([]);
        queryClient.invalidateQueries({
          queryKey: planScreeningsKeys.getDetail(planScreeningId)
        });
        queryClient.refetchQueries({
          queryKey: ordersKeys.all
        });
      },
      onError: (error: unknown) => {
        let msg = "Tạo vé mời thất bại";

        if (axios.isAxiosError<ApiError>(error)) {
          msg = error.response?.data?.message ?? msg;
        }

        message.error(msg);
      }
    });
  };

  const onCancelSeats = () => {
    if (isPlanScreeningPast) {
      message.error("Ca chiếu đã qua, không thể thao tác");
      return;
    }

    const body: CancelOrderDto = {
      planScreenId: planScreeningId,
      cancelReasonId: 0,
      notes: "Huỷ đơn",
      isRefund: true,
      cancelReasonMsg: "Huỷ đơn",
      ...buildSeatFieldsByFloor(selectedSeats)
    };

    cancelOrder.mutate(body, {
      onSuccess: () => {
        setSelectedSeats([]);
        queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreeningId) });
        message.success("Huỷ vé mời thành công");
      },
      onError: (error: unknown) => {
        let msg = "Huỷ vé mời thất bại";

        if (axios.isAxiosError<ApiError>(error)) {
          msg = error.response?.data?.message ?? msg;
        }

        message.error(msg);
      }
    });
  };

  return (
    <div className="bg-jiren dark:bg-app-bg border-t border-gray-300 dark:border-app-border shrink-0 px-4">
      <div className="p-2 flex gap-6 max-w-5xl mx-auto">
        <div className="flex-1 bg-app-bg-container py-2 px-4 rounded-md">
          <Descriptions size="small" items={items} column={2} />
        </div>
        <div>
          <p className="text-sm">Ghi chú</p>
          <Input.TextArea
            placeholder="Nhập ghi chú"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          {canCreate && (
            <Button
              variant="outlined"
              color="primary"
              className="h-full! font-bold"
              onClick={onBooking}
              disabled={selectedSeats.length === 0 || createOrder.isPending || isPlanScreeningPast}
            >
              Thêm vé mời
            </Button>
          )}

          {canDelete && (
            <Button
              variant="outlined"
              color="danger"
              className="h-full! font-bold"
              disabled={selectedSeats.length === 0 || createOrder.isPending || isPlanScreeningPast}
              onClick={onCancelSeats}
            >
              Hủy vé mời
            </Button>
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
    </div>
  );
};

export default Actions;
