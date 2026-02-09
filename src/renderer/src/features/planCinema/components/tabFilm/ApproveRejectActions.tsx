"use client";

import { useApproveRejectPlanCinema } from "@renderer/hooks/planCinemas/useApproveRejectPlanCinema";
import { Button, message } from "antd";

const ApproveRejectActions = ({
  planCinemaId,
  clearSelectedPlan
}: {
  planCinemaId: number;
  clearSelectedPlan: () => void;
}) => {
  const approveRejectPlanCinema = useApproveRejectPlanCinema();

  const onConfirm = (isApproved: boolean) => {
    approveRejectPlanCinema.mutate(
      { dto: { id: planCinemaId, isApproved } },
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
    <>
      <Button
        color="danger"
        variant="solid"
        disabled={approveRejectPlanCinema.isPending}
        onClick={() => onConfirm(false)}
      >
        Không chấp nhận
      </Button>
      <Button
        variant="solid"
        color="blue"
        disabled={approveRejectPlanCinema.isPending}
        onClick={() => onConfirm(true)}
      >
        Chấp nhận
      </Button>
    </>
  );
};

export default ApproveRejectActions;
