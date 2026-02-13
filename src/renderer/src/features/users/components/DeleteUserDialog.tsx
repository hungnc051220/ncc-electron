import { useDeleteUser } from "@renderer/hooks/users/useDeleteUser";
import { ApiError } from "@renderer/types";
import { message, Modal } from "antd";
import axios from "axios";

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  username: string;
}

const DeleteUserDialog = ({ open, onOpenChange, id, username }: DeleteUserDialogProps) => {
  const deleteUser = useDeleteUser();

  const onOk = () => {
    deleteUser.mutate(id, {
      onSuccess: () => {
        message.success("Xóa người dùng thành công");
        onOpenChange(false);
      },
      onError: (error: unknown) => {
        let msg = "Xóa người dùng thất bại";

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
      title="Xác nhận xóa người dùng"
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true
      }}
      confirmLoading={deleteUser.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa người dùng <strong>{username}</strong>? Thao tác không thể thu hồi.
    </Modal>
  );
};

export default DeleteUserDialog;
