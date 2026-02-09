"use client";

import { useDeleteShowTimeSlot } from "@renderer/hooks/showTimeSlots/useDeleteShowTimeSlot";
import { message, Modal } from "antd";

interface DeleteShowTimeSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
}

const DeleteShowTimeSlotDialog = ({
  open,
  onOpenChange,
  id,
  name
}: DeleteShowTimeSlotDialogProps) => {
  const deleteShowTimeSlot = useDeleteShowTimeSlot();

  const onOk = () => {
    deleteShowTimeSlot.mutate(id, {
      onSuccess: () => {
        message.success("Xóa khung giờ chiếu thành công");
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
      title="Xác nhận xóa khung giờ chiếu"
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true
      }}
      confirmLoading={deleteShowTimeSlot.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa khung giờ chiếu <strong>{name}</strong>? Thao tác không thể thu hồi.
    </Modal>
  );
};

export default DeleteShowTimeSlotDialog;
