import { useDeleteDiscount } from "@renderer/hooks/discounts/useDeleteDiscount";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { Modal } from "antd";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

interface DeleteDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
}

const DeleteDiscountDialog = ({ open, onOpenChange, id, name }: DeleteDiscountDialogProps) => {
  const { message } = useAntdApp();

  const deleteDiscount = useDeleteDiscount();

  const onOk = () => {
    deleteDiscount.mutate(id, {
      onSuccess: () => {
        message.success("Xóa giảm giá thành công");
        onOpenChange(false);
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Xóa giảm giá thất bại"));
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
