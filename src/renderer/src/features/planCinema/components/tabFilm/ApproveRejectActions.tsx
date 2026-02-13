import { useApproveRejectPlanCinema } from "@renderer/hooks/planCinemas/useApproveRejectPlanCinema";
import { ApiError } from "@renderer/types";
import { Button, message } from "antd";
import axios from "axios";

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
        onError: (error: unknown) => {
          let msg = "Cập nhật trạng thái kế hoạch thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
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
