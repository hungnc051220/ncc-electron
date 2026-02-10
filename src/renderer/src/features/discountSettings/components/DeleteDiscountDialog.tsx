"use client";

import { useDeleteDiscount } from "@renderer/hooks/discounts/useDeleteDiscount";
import { message, Modal } from "antd";

interface DeleteDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
}

const DeleteDiscountDialog = ({ open, onOpenChange, id, name }: DeleteDiscountDialogProps) => {
  const deleteDiscount = useDeleteDiscount();

  const onOk = () => {
    deleteDiscount.mutate(id, {
      onSuccess: () => {
        message.success("Xóa giảm giá thành công");
        onOpenChange(false);
      },
      onError: (error) => {
        message.error(error?.message || "Có lỗi bất thường xảy ra");
      }
    });
  };

  return (
    <Modal
      open={open}
      title="Xác nhận xóa giảm giá"
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true
      }}
      confirmLoading={deleteDiscount.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa giảm giá <strong>{name}</strong>? Thao tác không thể thu hồi.
    </Modal>
  );
};

export default DeleteDiscountDialog;
