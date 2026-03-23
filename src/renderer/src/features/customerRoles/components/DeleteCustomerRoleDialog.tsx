import { useDeleteCustomerRole } from "@renderer/hooks/customerRoles/useDeleteCustomerRole";
import { ApiError } from "@shared/types";
import { Modal, message } from "antd";
import axios from "axios";

interface DeleteCustomerRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
}

const DeleteCustomerRoleDialog = ({
  open,
  onOpenChange,
  id,
  name
}: DeleteCustomerRoleDialogProps) => {
  const deleteCustomerRole = useDeleteCustomerRole();

  const onOk = () => {
    deleteCustomerRole.mutate(id, {
      onSuccess: () => {
        message.success("Xóa nhóm người dùng thành công");
        onOpenChange(false);
      },
      onError: (error: unknown) => {
        let msg = "Xóa nhóm người dùng thất bại";

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
      title="Xác nhận xóa nhóm người dùng"
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{ danger: true }}
      confirmLoading={deleteCustomerRole.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa nhóm người dùng <strong>{name}</strong>? Thao tác không thể thu hồi.
    </Modal>
  );
};

export default DeleteCustomerRoleDialog;
