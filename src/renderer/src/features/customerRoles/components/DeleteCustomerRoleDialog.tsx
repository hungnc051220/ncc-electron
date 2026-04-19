import { useDeleteCustomerRole } from "@renderer/hooks/customerRoles/useDeleteCustomerRole";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { Modal } from "antd";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

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
  const { message } = useAntdApp();

  const deleteCustomerRole = useDeleteCustomerRole();

  const onOk = () => {
    deleteCustomerRole.mutate(id, {
      onSuccess: () => {
        message.success("Xóa nhóm người dùng thành công");
        onOpenChange(false);
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Xóa nhóm người dùng thất bại"));
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
