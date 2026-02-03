"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "antd";
import axios from "axios";
import { toast } from "sonner";

const SendForApproveActions = ({ planCinemaId }: { planCinemaId: number }) => {
  const queryClient = useQueryClient();

  const approvePlanMutation = useMutation({
    mutationFn: () => {
      return axios.post("/api/plan-cinema/update", {
        id: planCinemaId,
        status: 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-cinema"] });
      toast.success("Cập nhật trạng thái kế hoạch thành công");
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  return (
    <Button
      variant="outlined"
      onClick={() => approvePlanMutation.mutate()}
      loading={approvePlanMutation.isPending}
    >
      Gửi duyệt
    </Button>
  );
};

export default SendForApproveActions;
