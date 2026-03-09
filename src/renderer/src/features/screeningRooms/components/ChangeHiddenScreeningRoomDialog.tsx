import { useUpdateScreeningRoom } from "@renderer/hooks/screeningRooms/useUpdateScreeningRoom";
import { ApiError, RoomProps } from "@shared/types";
import { message, Modal } from "antd";
import axios from "axios";

interface ChangeHiddenScreeningRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: RoomProps;
  name: string;
}

const ChangeHiddenScreeningRoomDialog = ({
  open,
  onOpenChange,
  room,
  name
}: ChangeHiddenScreeningRoomDialogProps) => {
  const updateScreeningRoom = useUpdateScreeningRoom();

  const onOk = () => {
    updateScreeningRoom.mutate(
      {
        id: room.id,
        dto: {
          ...room,
          hidden: !room.hidden
        }
      },
      {
        onSuccess: () => {
          message.success("Thay đổi ẩn/hiện phòng chiếu thành công");
          onOpenChange(false);
        },
        onError: (error: unknown) => {
          let msg = "Thay đổi ẩn/hiện phòng chiếu thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
        }
      }
    );
  };

  return (
    <Modal
      open={open}
      title="Xác nhận thay đổi trạng thái ẩn/hiện phòng chiếu"
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      confirmLoading={updateScreeningRoom.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn thay đổi trạng thái ẩn/hiện phòng chiếu <strong>{name}</strong>?
    </Modal>
  );
};

export default ChangeHiddenScreeningRoomDialog;
