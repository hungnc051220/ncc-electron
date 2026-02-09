"use client";

import { useDeleteTicketPrice } from "@renderer/hooks/ticketPrices/useDeleteTicketPrice";
import { message, Modal } from "antd";

interface DeleteTicketPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
}

const DeleteTicketPriceDialog = ({
  open,
  onOpenChange,
  id,
  name
}: DeleteTicketPriceDialogProps) => {
  const deleteTicketPrice = useDeleteTicketPrice();

  const onOk = () => {
    deleteTicketPrice.mutate(id, {
      onSuccess: () => {
        message.success("Xóa giá vé thành công");
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
      title="Xác nhận xóa giá vé"
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true
      }}
      confirmLoading={deleteTicketPrice.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa giá vé <strong>{name}</strong>? Thao tác không thể thu hồi.
    </Modal>
  );
};

export default DeleteTicketPriceDialog;
