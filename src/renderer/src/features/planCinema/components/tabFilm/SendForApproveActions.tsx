"use client";

import { useUpdatePlanCinema } from "@renderer/hooks/planCinemas/useUpdatePlanCinema";
import { Button, message } from "antd";

const SendForApproveActions = ({
  planCinemaId,
  clearSelectedPlan
}: {
  planCinemaId: number;
  clearSelectedPlan: () => void;
}) => {
  const updatePlanCinema = useUpdatePlanCinema();

  const onConfirm = () => {
    updatePlanCinema.mutate(
      { id: planCinemaId, dto: { status: 1 } },
      {
        onSuccess: () => {
          clearSelectedPlan();
          message.success("Cập nhật trạng thái kế hoạch thành công");
        },
        onError: (error) => {
          message.error(error?.message || "Có lỗi bất thường xảy ra");
        }
      }
    );
  };

  return (
    <Button variant="outlined" onClick={onConfirm} loading={updatePlanCinema.isPending}>
      Gửi duyệt
    </Button>
  );
};

export default SendForApproveActions;
