import { useUpdatePlanCinema } from "@renderer/hooks/planCinemas/useUpdatePlanCinema";
import { usePermission } from "@renderer/permissions/usePermission";
import { ApiError } from "@shared/types";
import { Button, message } from "antd";
import axios from "axios";

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
          let msg = "Cập nhật trạng thái kế hoạch thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
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
