"use client";

import { useDeleteManufacturer } from "@renderer/hooks/manufacturers/useDeleteManufacturer";
import { message, Modal } from "antd";

interface DeleteManufacturerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
}

const DeleteManufacturerDialog = ({
  open,
  onOpenChange,
  id,
  name
}: DeleteManufacturerDialogProps) => {
  const deleteManufacturer = useDeleteManufacturer();

  const onOk = () => {
    deleteManufacturer.mutate(id, {
      onSuccess: () => {
        message.success("Xóa hãng phim thành công");
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
      title="Xác nhận xóa hãng phim"
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true
      }}
      confirmLoading={deleteManufacturer.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa hãng phim <strong>{name}</strong>? Thao tác không thể thu hồi.
    </Modal>
  );
};

export default DeleteManufacturerDialog;
