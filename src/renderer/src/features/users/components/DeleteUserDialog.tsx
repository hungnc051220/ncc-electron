import { useDeleteUser } from "@renderer/hooks/users/useDeleteUser";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { message, Modal } from "antd";

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
        message.error(getApiErrorMessage(error, "Xóa người dùng thất bại"));
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
