import { useUpdatePlanCinema } from "@renderer/hooks/planCinemas/useUpdatePlanCinema";
import { ApiError } from "@shared/types";
import { Button, message } from "antd";
import axios from "axios";

const RestoreActions = ({
  planCinemaId,
  clearSelectedPlan
}: {
  planCinemaId: number;
  clearSelectedPlan: () => void;
}) => {
  const updatePlanCinema = useUpdatePlanCinema();

  const onConfirm = () => {
    updatePlanCinema.mutate(
      { id: planCinemaId, dto: { status: 3 } },
      {
        onSuccess: () => {
          clearSelectedPlan();
          message.success("Khôi phục kế hoạch thành công");
        },
        onError: (error: unknown) => {
          let msg = "Khôi phục kế hoạch thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
        }
      }
    );
  };

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
