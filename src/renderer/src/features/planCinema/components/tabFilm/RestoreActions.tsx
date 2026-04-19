import { useUpdatePlanCinema } from "@renderer/hooks/planCinemas/useUpdatePlanCinema";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { usePermission } from "@renderer/permissions/usePermission";
import { Button } from "antd";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

const RestoreActions = ({
  planCinemaId,
  clearSelectedPlan
}: {
  planCinemaId: number;
  clearSelectedPlan: () => void;
}) => {
  const { message } = useAntdApp();

  const updatePlanCinema = useUpdatePlanCinema();
  const { can } = usePermission();
  const canApprove = can("plan_cinema", "approve");

  const onConfirm = () => {
    updatePlanCinema.mutate(
      { id: planCinemaId, dto: { status: 3 } },
      {
        onSuccess: () => {
          clearSelectedPlan();
          message.success("Khôi phục kế hoạch thành công");
        },
        onError: (error: unknown) => {
          message.error(getApiErrorMessage(error, "Khôi phục kế hoạch thất bại"));
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
      Khôi phục
    </Button>
  );
};

export default RestoreActions;
