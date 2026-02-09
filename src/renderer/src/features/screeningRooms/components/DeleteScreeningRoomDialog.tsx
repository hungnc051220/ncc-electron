"use client";

import { useDeleteScreeningRoom } from "@renderer/hooks/screeningRooms/useDeleteScreeningRoom";
import { message, Modal } from "antd";

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
      onError: (error) => {
        message.error(error?.message || "Có lỗi bất thường xảy ra");
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
