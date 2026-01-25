"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import axios from "axios";
import { toast } from "sonner";

interface DeleteSeatTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
}

const DeleteSeatTypeDialog = ({
  open,
  onOpenChange,
  id,
  name,
}: DeleteSeatTypeDialogProps) => {
  const queryClient = useQueryClient();
  const deleteCancellationReasonMutation = useMutation({
    mutationFn: () => {
      return axios.post("/api/seat-types/delete", {
        id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seat-types"] });
      toast.success("Xóa loại ghế, vị trí thành công");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  return (
    <Modal
      open={open}
      title="Xác nhận xóa loại ghế, vị trí"
      onOk={() => deleteCancellationReasonMutation.mutate()}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true,
      }}
      confirmLoading={deleteCancellationReasonMutation.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa loại ghế, vị trí <strong>{name}</strong>? Thao
      tác không thể thu hồi.
    </Modal>
  );
};

export default DeleteSeatTypeDialog;
