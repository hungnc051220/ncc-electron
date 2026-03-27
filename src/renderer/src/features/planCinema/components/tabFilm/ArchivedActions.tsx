import { useUpdatePlanCinema } from "@renderer/hooks/planCinemas/useUpdatePlanCinema";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { usePermission } from "@renderer/permissions/usePermission";
import { Button, message } from "antd";

const ArchivedActions = ({
  planCinemaId,
  clearSelectedPlan
}: {
  planCinemaId: number;
  clearSelectedPlan: () => void;
}) => {
  const updatePlanCinema = useUpdatePlanCinema();
  const { can } = usePermission();
  const canApprove = can("plan_cinema", "approve");

  const onConfirm = () => {
    updatePlanCinema.mutate(
      { id: planCinemaId, dto: { status: 4 } },
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
    <Button
      variant="outlined"
      color="cyan"
      onClick={onConfirm}
      disabled={updatePlanCinema.isPending}
    >
      Lưu trữ
    </Button>
  );
};

export default ArchivedActions;
