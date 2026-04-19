import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { useUpdatePlanScreening } from "@renderer/hooks/planScreenings/useUpdatePlanScreening";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { formatMoney, isPlanScreeningLocked } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { useAuthStore } from "@renderer/store/auth.store";
import { ListSeat, PlanScreeningDetailProps } from "@shared/types";
import { useQueryClient } from "@tanstack/react-query";
import type { DescriptionsProps } from "antd";
import { Button, Descriptions, Typography } from "antd";
import { Dispatch, SetStateAction, useMemo } from "react";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

const buildMergedNoOnlinePayload = (
  selected: ListSeat[],
  currentData: PlanScreeningDetailProps,
  type: "online" | "offline"
) => {
  const floorMap = {
    1: parseSeatString(currentData.noOnlineChairF1),
    2: parseSeatString(currentData.noOnlineChairF2),
    3: parseSeatString(currentData.noOnlineChairF3)
  };

  selected.forEach((s) => {
    const set = floorMap[s.floor as 1 | 2 | 3];
    if (!set) return;

    if (type === "offline") {
      set.add(s.seat);
    } else {
      set.delete(s.seat);
    }
  });

  return {
    noOnlineChairF1: stringifySeatSet(floorMap[1]),
    noOnlineChairF2: stringifySeatSet(floorMap[2]),
    noOnlineChairF3: stringifySeatSet(floorMap[3])
  };
};

const parseSeatString = (value?: string) => {
  if (!value) return new Set<string>();
  return new Set(value.split(",").filter(Boolean));
};

const stringifySeatSet = (set: Set<string>) => {
  return Array.from(set).join(",");
};

interface ActionsProps {
  data?: PlanScreeningDetailProps;
  planScreeningId: number;
  selectedSeats: ListSeat[];
  setSelectedSeats: Dispatch<SetStateAction<ListSeat[]>>;
}

const Actions = ({ planScreeningId, selectedSeats, setSelectedSeats, data }: ActionsProps) => {
  const { message } = useAntdApp();

  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const { data: user } = useUserDetail(userId!);
  const { can } = usePermission();
  const canUpdate = can("online_seat_booking", "update");
  const isPlanScreeningPast = isPlanScreeningLocked(data?.projectDate, data?.projectTime);

  const updatePlanScreening = useUpdatePlanScreening();

  const totalPrice = useMemo(
    () => selectedSeats.reduce((acc, cur) => acc + cur.price, 0),
    [selectedSeats]
  );
  const selectedSeatCodes = selectedSeats.map((s) => s.code).join(", ");

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
        <div className="flex flex-1 justify-end overflow-hidden">
          <Typography.Text
            className="max-w-full text-right"
            ellipsis={{ tooltip: selectedSeatCodes || undefined }}
          >
            {selectedSeatCodes || "-"}
          </Typography.Text>
        </div>
      )
    },
    {
      key: "4",
      label: "Nhân viên xử lý",
      children: <p className="flex-1 text-right">{user?.fullname}</p>
    }
  ];

  const onUpdateSeatsOnline = (type: "online" | "offline") => {
    if (!data) return;

    const formattedSeats = buildMergedNoOnlinePayload(selectedSeats, data, type);

    updatePlanScreening.mutate(
      {
        id: planScreeningId,
        dto: {
          ...data,
          ...formattedSeats
        }
      },
      {
        onSuccess: () => {
          message.success("Cập nhật trạng thái ghế bán online thành công");
          setSelectedSeats([]);
          queryClient.invalidateQueries({
            queryKey: planScreeningsKeys.getDetail(planScreeningId)
          });
        },
        onError: (error: unknown) => {
          message.error(getApiErrorMessage(error, "Cập nhật trạng thái ghế bán online thất bại"));
        }
      }
    );
  };

  return (
    <div className="shrink-0 border-t border-emerald-900/20 bg-emerald-100/50 px-2 backdrop-blur-md dark:border-emerald-300/20 dark:bg-emerald-950/80">
      <div className="p-2 flex gap-6 max-w-5xl mx-auto">
        <div className="flex-1 bg-app-bg-container py-2 px-4 rounded-md">
          <Descriptions size="small" items={items} column={2} />
        </div>
        <div className="flex gap-3">
          <Button
            variant="outlined"
            color="danger"
            className="h-full! font-bold"
            disabled={
              selectedSeats.length === 0 ||
              updatePlanScreening.isPending ||
              !canUpdate ||
              isPlanScreeningPast
            }
            onClick={() => onUpdateSeatsOnline("offline")}
          >
            Hủy bán online
          </Button>
          <Button
            variant="outlined"
            color="primary"
            className="h-full! font-bold"
            onClick={() => onUpdateSeatsOnline("online")}
            disabled={
              selectedSeats.length === 0 ||
              updatePlanScreening.isPending ||
              !canUpdate ||
              isPlanScreeningPast
            }
          >
            Bán online
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Actions;
