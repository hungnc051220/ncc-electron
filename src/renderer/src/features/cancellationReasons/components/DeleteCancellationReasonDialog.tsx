"use client";

import { useDeleteCancellationReason } from "@renderer/hooks/cancellationReasons/useDeleteCancellationReason";
import { message, Modal } from "antd";

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
  name
}: DeleteCancellationReasonDialogProps) => {
  const deleteCancellationReason = useDeleteCancellationReason();

  const onOk = () => {
    deleteCancellationReason.mutate(id, {
      onSuccess: () => {
        message.success("Xóa lý do hủy vé thành công");
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
      title="Xác nhận xóa lý do hủy vé"
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true
      }}
      confirmLoading={deleteCancellationReason.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa lý do hủy vé <strong>{name}</strong>? Thao tác không thể thu hồi.
    </Modal>
  );
};

export default DeleteCancellationReasonDialog;
