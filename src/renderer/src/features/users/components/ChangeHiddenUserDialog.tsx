"use client";

import { useUpdateUser } from "@renderer/hooks/users/useUpdateUser";
import { UserProps } from "@renderer/types";
import { message, Modal } from "antd";

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
        onError: (error) => {
          message.error(error?.message || "Có lỗi bất thường xảy ra");
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
