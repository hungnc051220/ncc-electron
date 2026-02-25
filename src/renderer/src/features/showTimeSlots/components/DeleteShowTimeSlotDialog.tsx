import { useDeleteShowTimeSlot } from "@renderer/hooks/showTimeSlots/useDeleteShowTimeSlot";
import { ApiError } from "@shared/types";
import { message, Modal } from "antd";
import axios from "axios";

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
      onError: (error: unknown) => {
        let msg = "Xóa khung giờ chiếu thất bại";

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
