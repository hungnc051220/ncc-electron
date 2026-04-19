import { useDeleteTicketPrice } from "@renderer/hooks/ticketPrices/useDeleteTicketPrice";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { Modal } from "antd";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

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
  const { message } = useAntdApp();

  const deleteTicketPrice = useDeleteTicketPrice();

  const onOk = () => {
    deleteTicketPrice.mutate(id, {
      onSuccess: () => {
        message.success("Xóa giá vé thành công");
        onOpenChange(false);
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Xóa giá vé thất bại"));
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
