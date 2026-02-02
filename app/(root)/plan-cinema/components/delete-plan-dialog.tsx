"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import axios from "axios";
import { toast } from "sonner";

interface DeletePlanCinemaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
}

const DeletePlanCinemaDialog = ({
  open,
  onOpenChange,
  id,
  name,
}: DeletePlanCinemaDialogProps) => {
  const queryClient = useQueryClient();
  const deletePlanCinemaMutation = useMutation({
    mutationFn: () => {
      return axios.post("/api/plan-cinema/delete", {
        id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-cinema"] });
      toast.success("Xóa kế hoạch chiếu phim thành công");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  return (
    <Modal
      open={open}
      title="Xác nhận xóa kế hoạch chiếu phim"
      onOk={() => deletePlanCinemaMutation.mutate()}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true,
      }}
      confirmLoading={deletePlanCinemaMutation.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa kế hoạch <strong>{name}</strong>? Thao tác không
      thể thu hồi.
    </Modal>
  );
};

export default DeletePlanCinemaDialog;
