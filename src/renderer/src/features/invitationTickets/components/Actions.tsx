import { OrderDto } from "@renderer/api/orders.api";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { useCreateOrder } from "@renderer/hooks/orders/useCreateOrder";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { formatMoney } from "@renderer/lib/utils";
import { useAuthStore } from "@renderer/store/auth.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import { ApiError, ListSeat } from "@shared/types";
import { useQueryClient } from "@tanstack/react-query";
import type { DescriptionsProps } from "antd";
import { Button, Descriptions, message } from "antd";
import axios from "axios";
import { Dispatch, SetStateAction, useMemo } from "react";

interface ActionsProps {
  planScreeningId: number;
  selectedSeats: ListSeat[];
  setSelectedSeats: Dispatch<SetStateAction<ListSeat[]>>;
}

const Actions = ({ planScreeningId, selectedSeats, setSelectedSeats }: ActionsProps) => {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const { data: user } = useUserDetail(userId!);
  const { posName, posShortName } = useSettingPosStore();

  const createOrder = useCreateOrder();

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
    if (!posName || !posShortName) return;

    const floorNo = selectedSeats[0]?.floor || 1;
    const body: OrderDto = {
      planScreenId: planScreeningId,
      floorNo,
      isInvitation: true,
      paymentMethodSystemName: "POS",
      posName,
      posShortName
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
        message.success("Tạo vé mời thành công");
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

  return (
    <div className="bg-beerus border-t border-gray-300 shrink-0 px-4">
      <div className="p-2 flex gap-6 max-w-5xl mx-auto">
        <div className="flex-1 bg-white py-2 px-4 rounded-md">
          <Descriptions size="small" items={items} column={2} />
        </div>
        <div className="flex gap-3">
          <Button
            variant="outlined"
            color="primary"
            className="h-full! font-bold"
            onClick={onBooking}
            disabled={selectedSeats.length === 0 || createOrder.isPending}
          >
            Thêm vé mời
          </Button>

          <Button
            variant="outlined"
            color="danger"
            className="h-full! font-bold"
            disabled={selectedSeats.length === 0 || createOrder.isPending}
          >
            Hủy vé mời
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Actions;
