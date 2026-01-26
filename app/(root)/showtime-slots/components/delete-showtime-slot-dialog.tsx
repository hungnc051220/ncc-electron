"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import axios from "axios";
import { toast } from "sonner";

interface DeleteShowtimeSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
}

const DeleteShowtimeSlotDialog = ({
  open,
  onOpenChange,
  id,
  name,
}: DeleteShowtimeSlotDialogProps) => {
  const queryClient = useQueryClient();
  const deleteShowtimeSlotMutation = useMutation({
    mutationFn: () => {
      return axios.post("/api/showtime-slots/delete", {
        id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["showtime-slots"] });
      toast.success("Xóa khung giờ chiếu thành công");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  return (
    <Modal
      open={open}
      title="Xác nhận xóa khung giờ chiếu"
      onOk={() => deleteShowtimeSlotMutation.mutate()}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true,
      }}
      confirmLoading={deleteShowtimeSlotMutation.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa khung giờ chiếu <strong>{name}</strong>? Thao
      tác không thể thu hồi.
    </Modal>
  );
};

export default DeleteShowtimeSlotDialog;
