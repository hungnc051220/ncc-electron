import { useApproveRejectPlanCinema } from "@renderer/hooks/planCinemas/useApproveRejectPlanCinema";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { usePermission } from "@renderer/permissions/usePermission";
import { Button, message } from "antd";

const ApproveRejectActions = ({
  planCinemaId,
  clearSelectedPlan
}: {
  planCinemaId: number;
  clearSelectedPlan: () => void;
}) => {
  const approveRejectPlanCinema = useApproveRejectPlanCinema();
  const { can } = usePermission();
  const canApprove = can("plan_cinema", "approve");

  const onConfirm = (isApproved: boolean) => {
    approveRejectPlanCinema.mutate(
      { dto: { id: planCinemaId, isApproved } },
      {
        onSuccess: () => {
          clearSelectedPlan();
          message.success("Cập nhật trạng thái kế hoạch thành công");
        },
        onError: (error: unknown) => {
          message.error(getApiErrorMessage(error, "Cập nhật trạng thái kế hoạch thất bại"));
        }
      }
    );
  };

  if (!canApprove) {
    return null;
  }

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
