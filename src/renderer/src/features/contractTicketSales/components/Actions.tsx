import { SetSeatsContractTicketSaleDto } from "@renderer/api/contractTicketSales.api";
import { contractTicketSalesKeys } from "@renderer/hooks/contractTicketSales/keys";
import { useSetSeatsContractTicketSale } from "@renderer/hooks/contractTicketSales/useSetSeatsContractTicketSale";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { formatMoney } from "@renderer/lib/utils";
import { useAuthStore } from "@renderer/store/auth.store";
import { ApiError, ListSeat } from "@renderer/types";
import { useQueryClient } from "@tanstack/react-query";
import type { DescriptionsProps } from "antd";
import { Button, Descriptions, message } from "antd";
import axios from "axios";
import { Dispatch, SetStateAction, useMemo } from "react";

interface ActionsProps {
  contractOrderId: number;
  planScreeningId: number;
  selectedSeats: ListSeat[];
  setSelectedSeats: Dispatch<SetStateAction<ListSeat[]>>;
}

const Actions = ({
  contractOrderId,
  planScreeningId,
  selectedSeats,
  setSelectedSeats
}: ActionsProps) => {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const { data: user } = useUserDetail(userId!);

  const setSeatsContractTicketSale = useSetSeatsContractTicketSale();

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

  const onUpdateSeat = () => {
    const floorNo = selectedSeats[0]?.floor || 1;
    const body: SetSeatsContractTicketSaleDto = {
      planScreenId: planScreeningId,
      floorNo,
      operation: 1
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
            onClick={onUpdateSeat}
            disabled={selectedSeats.length === 0 || setSeatsContractTicketSale.isPending}
          >
            Thêm vé hợp đồng
          </Button>

          <Button
            variant="outlined"
            color="danger"
            className="h-full! font-bold"
            disabled={selectedSeats.length === 0 || setSeatsContractTicketSale.isPending}
          >
            Hủy vé hợp đồng
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Actions;
