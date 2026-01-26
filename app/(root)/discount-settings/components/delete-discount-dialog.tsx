"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import axios from "axios";
import { toast } from "sonner";

interface DeleteDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
}

const DeleteDiscountDialog = ({
  open,
  onOpenChange,
  id,
  name,
}: DeleteDiscountDialogProps) => {
  const queryClient = useQueryClient();
  const deleteDiscountMutation = useMutation({
    mutationFn: () => {
      return axios.post("/api/discounts/delete", {
        id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("Xóa giảm giá thành công");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  return (
    <Modal
      open={open}
      title="Xác nhận xóa giảm giá"
      onOk={() => deleteDiscountMutation.mutate()}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true,
      }}
      confirmLoading={deleteDiscountMutation.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa giảm giá <strong>{name}</strong>? Thao tác không
      thể thu hồi.
    </Modal>
  );
};

export default DeleteDiscountDialog;
