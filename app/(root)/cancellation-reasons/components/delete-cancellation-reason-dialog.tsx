"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import axios from "axios";
import { toast } from "sonner";

interface DeleteCancellationReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
}

const DeleteCancellationReasonDialog = ({
  open,
  onOpenChange,
  id,
  name,
}: DeleteCancellationReasonDialogProps) => {
  const queryClient = useQueryClient();
  const deleteCancellationReasonMutation = useMutation({
    mutationFn: () => {
      return axios.post("/api/cancellation-reasons/delete", {
        id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cancellation-reasons"] });
      toast.success("Xóa lý do hủy vé thành công");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  return (
    <Modal
      open={open}
      title="Xác nhận xóa lý do hủy vé"
      onOk={() => deleteCancellationReasonMutation.mutate()}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true,
      }}
      confirmLoading={deleteCancellationReasonMutation.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa lý do hủy vé <strong>{name}</strong>? Thao tác
      không thể thu hồi.
    </Modal>
  );
};

export default DeleteCancellationReasonDialog;
