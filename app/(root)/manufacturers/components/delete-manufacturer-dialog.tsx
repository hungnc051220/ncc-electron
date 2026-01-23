"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import axios from "axios";
import { toast } from "sonner";

interface DeleteManufacturerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
}

const DeleteManufacturerDialog = ({
  open,
  onOpenChange,
  id,
  name,
}: DeleteManufacturerDialogProps) => {
  const queryClient = useQueryClient();
  const deleteManufacturerMutation = useMutation({
    mutationFn: () => {
      return axios.post("/api/manufacturer/delete", {
        id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
      toast.success("Xóa hãng phim thành công");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  return (
    <Modal
      open={open}
      title="Xác nhận xóa hãng phim"
      onOk={() => deleteManufacturerMutation.mutate()}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true,
      }}
      confirmLoading={deleteManufacturerMutation.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa hãng phim <strong>{name}</strong>? Thao tác
      không thể thu hồi.
    </Modal>
  );
};

export default DeleteManufacturerDialog;
