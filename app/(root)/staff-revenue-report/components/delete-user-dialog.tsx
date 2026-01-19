"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import axios from "axios";
import { toast } from "sonner";

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  username: string;
}

const DeleteUserDialog = ({
  open,
  onOpenChange,
  id,
  username,
}: DeleteUserDialogProps) => {
  const queryClient = useQueryClient();
  const deleteUserMutation = useMutation({
    mutationFn: () => {
      return axios.post("/api/user/delete", {
        id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Xóa người dùng thành công");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  return (
    <Modal
      open={open}
      title="Xác nhận xóa người dùng"
      onOk={() => deleteUserMutation.mutate()}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true,
      }}
      confirmLoading={deleteUserMutation.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa người dùng <strong>{username}</strong>? Thao tác
      không thể thu hồi.
    </Modal>
  );
};

export default DeleteUserDialog;
