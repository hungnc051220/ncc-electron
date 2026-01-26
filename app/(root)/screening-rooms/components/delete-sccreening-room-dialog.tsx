"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import axios from "axios";
import { toast } from "sonner";

interface DeleteScreeningRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
}

const DeleteScreeningRoomDialog = ({
  open,
  onOpenChange,
  id,
  name,
}: DeleteScreeningRoomDialogProps) => {
  const queryClient = useQueryClient();
  const deleteScreeningRoomMutation = useMutation({
    mutationFn: () => {
      return axios.post("/api/screening-rooms/delete", {
        id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screening-rooms"] });
      toast.success("Xóa phòng chiếu thành công");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  return (
    <Modal
      open={open}
      title="Xác nhận xóa phòng chiếu"
      onOk={() => deleteScreeningRoomMutation.mutate()}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true,
      }}
      confirmLoading={deleteScreeningRoomMutation.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa phòng chiếu <strong>{name}</strong>? Thao tác
      không thể thu hồi.
    </Modal>
  );
};

export default DeleteScreeningRoomDialog;
