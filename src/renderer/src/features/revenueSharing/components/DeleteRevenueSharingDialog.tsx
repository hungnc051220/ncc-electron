import { useDeleteCancellationReason } from "@renderer/hooks/cancellationReasons/useDeleteCancellationReason";
import { ApiError } from "@shared/types";
import { message, Modal } from "antd";
import axios from "axios";

interface DeleteRevenueSharingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
}

const DeleteRevenueSharingDialog = ({
  open,
  onOpenChange,
  id,
  name
}: DeleteRevenueSharingDialogProps) => {
  const deleteCancellationReason = useDeleteCancellationReason();

  const onOk = () => {
    deleteCancellationReason.mutate(id, {
      onSuccess: () => {
        message.success("Xóa lý do hủy vé thành công");
        onOpenChange(false);
      },
      onError: (error: unknown) => {
        let msg = "Xóa lý do hủy vé thất bại";

        if (axios.isAxiosError<ApiError>(error)) {
          msg = error.response?.data?.message ?? msg;
        }

        message.error(msg);
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

export default DeleteRevenueSharingDialog;
