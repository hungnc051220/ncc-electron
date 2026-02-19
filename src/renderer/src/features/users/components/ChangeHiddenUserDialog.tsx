import { useUpdateUser } from "@renderer/hooks/users/useUpdateUser";
import { ApiError, UserProps } from "@shared/types";
import { message, Modal } from "antd";
import axios from "axios";

interface ChangeHiddenUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProps;
  username: string;
}

const ChangeHiddenUserDialog = ({
  open,
  onOpenChange,
  user,
  username
}: ChangeHiddenUserDialogProps) => {
  const changeStatusUser = useUpdateUser();

  const onOk = () => {
    changeStatusUser.mutate(
      {
        id: user.id,
        dto: {
          ...user,
          roleIds: user.roleIds.split(",").map((item) => Number(item)),
          isHidden: !user.isHidden
        }
      },
      {
        onSuccess: () => {
          message.success("Thay đổi ẩn/hiện người dùng thành công");
          onOpenChange(false);
        },
        onError: (error: unknown) => {
          let msg = "Thay đổi ẩn/hiện người dùng thất bại";

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
      title="Xác nhận thay đổi trạng thái ẩn/hiện người dùng"
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      confirmLoading={changeStatusUser.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn thay đổi trạng thái ẩn/hiện người dùng <strong>{username}</strong>?
    </Modal>
  );
};

export default ChangeHiddenUserDialog;
