import { useDeleteDiscount } from "@renderer/hooks/discounts/useDeleteDiscount";
import { ApiError } from "@renderer/types";
import { message, Modal } from "antd";
import axios from "axios";

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
      onError: (error: unknown) => {
        let msg = "Xóa giảm giá thất bại";

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
