"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import axios from "axios";
import { toast } from "sonner";

interface DeleteFilmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  filmName: string;
}

const DeleteFilmDialog = ({
  open,
  onOpenChange,
  id,
  filmName,
}: DeleteFilmDialogProps) => {
  const queryClient = useQueryClient();

  const deleteFilmMutation = useMutation({
    mutationFn: () => {
      return axios.post("/api/film/delete", {
        id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["films"] });
      toast.success("Xóa phim thành công");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  return (
    <Modal
      open={open}
      title="Xác nhận xóa phim"
      onOk={() => deleteFilmMutation.mutate()}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true,
      }}
      confirmLoading={deleteFilmMutation.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa phim <strong>{filmName}</strong>? Thao tác không
      thể thu hồi.
    </Modal>
  );
};

export default DeleteFilmDialog;
