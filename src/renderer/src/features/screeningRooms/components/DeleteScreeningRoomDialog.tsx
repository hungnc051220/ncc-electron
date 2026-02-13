import { useDeleteScreeningRoom } from "@renderer/hooks/screeningRooms/useDeleteScreeningRoom";
import { ApiError } from "@renderer/types";
import { message, Modal } from "antd";
import axios from "axios";

interface DeleteScreeningRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
}

const DeleteScreeningRoomDialog = ({
  open,
  onOpenChange,
  id,
  name
}: DeleteScreeningRoomDialogProps) => {
  const deleteScreeningRoom = useDeleteScreeningRoom();

  const onOk = () => {
    deleteScreeningRoom.mutate(id, {
      onSuccess: () => {
        message.success("Xóa phòng chiếu thành công");
        onOpenChange(false);
      },
      onError: (error: unknown) => {
        let msg = "Xóa phòng chiếu thất bại";

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
      title="Xác nhận xóa phòng chiếu"
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true
      }}
      confirmLoading={deleteScreeningRoom.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa phòng chiếu <strong>{name}</strong>? Thao tác không thể thu hồi.
    </Modal>
  );
};

export default DeleteScreeningRoomDialog;
