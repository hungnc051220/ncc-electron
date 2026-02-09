"use client";

import { useDeleteSeatType } from "@renderer/hooks/seatTypes/useDeleteSeatType";
import { message, Modal } from "antd";

interface DeleteSeatTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
}

const DeleteSeatTypeDialog = ({ open, onOpenChange, id, name }: DeleteSeatTypeDialogProps) => {
  const deleteSeatType = useDeleteSeatType();

  const onOk = () => {
    deleteSeatType.mutate(id, {
      onSuccess: () => {
        message.success("Xóa loại ghế, vị trí thành công");
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
      title="Xác nhận xóa loại ghế, vị trí"
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true
      }}
      confirmLoading={deleteSeatType.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa loại ghế, vị trí <strong>{name}</strong>? Thao tác không thể thu
      hồi.
    </Modal>
  );
};

export default DeleteSeatTypeDialog;
