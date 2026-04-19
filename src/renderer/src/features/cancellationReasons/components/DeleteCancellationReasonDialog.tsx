import { useDeleteCancellationReason } from "@renderer/hooks/cancellationReasons/useDeleteCancellationReason";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { Modal } from "antd";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

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
  const { message } = useAntdApp();

  const deleteCancellationReason = useDeleteCancellationReason();

  const onOk = () => {
    deleteCancellationReason.mutate(id, {
      onSuccess: () => {
        message.success("Xóa lý do hủy vé thành công");
        onOpenChange(false);
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Xóa lý do hủy vé thất bại"));
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
