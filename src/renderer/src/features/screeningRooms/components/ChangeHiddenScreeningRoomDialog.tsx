import { useUpdateScreeningRoom } from "@renderer/hooks/screeningRooms/useUpdateScreeningRoom";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { RoomProps } from "@shared/types";
import { Modal } from "antd";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

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
  const { message } = useAntdApp();

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
          message.error(getApiErrorMessage(error, "Thay đổi ẩn/hiện phòng chiếu thất bại"));
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
