"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "antd";
import axios from "axios";
import { toast } from "sonner";

const ApproveRejectActions = ({
  planCinemaId,
  clearSelectedPlan,
}: {
  planCinemaId: number;
  clearSelectedPlan: () => void;
}) => {
  const queryClient = useQueryClient();

  const approvedRejectPlanMutation = useMutation({
    mutationFn: (isApproved: boolean) => {
      return axios.post("/api/plan-cinema/approve-reject", {
        id: planCinemaId,
        isApproved,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-cinema"] });
      clearSelectedPlan();
      toast.success("Cập nhật trạng thái kế hoạch thành công");
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  return (
    <>
      <Button
        color="danger"
        variant="solid"
        disabled={approvedRejectPlanMutation.isPending}
        onClick={() => approvedRejectPlanMutation.mutate(false)}
      >
        Không chấp nhận
      </Button>
      <Button
        variant="solid"
        color="cyan"
        disabled={approvedRejectPlanMutation.isPending}
        onClick={() => approvedRejectPlanMutation.mutate(true)}
      >
        Chấp nhận
      </Button>
    </>
  );
};

export default ApproveRejectActions;
