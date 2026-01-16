"use client";

import { UserProps } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import axios from "axios";
import { toast } from "sonner";

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
  username,
}: ChangeHiddenUserDialogProps) => {
  const queryClient = useQueryClient();
  const updateUserMutation = useMutation({
    mutationFn: (data: UserProps) => {
      return axios.post("/api/user/update", {
        id: data.id,
        isHidden: !data.isHidden,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Thay đổi ẩn/hiện người dùng thành công");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  return (
    <Modal
      open={open}
      title="Xác nhận thay đổi trạng thái ẩn/hiện người dùng"
      onOk={() => updateUserMutation.mutate(user)}
      onCancel={() => onOpenChange(false)}
      confirmLoading={updateUserMutation.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn thay đổi trạng thái ẩn/hiện người dùng{" "}
      <strong>{username}</strong>?
    </Modal>
  );
};

export default ChangeHiddenUserDialog;
