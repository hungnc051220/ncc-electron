"use client";

import { useDeleteFilm } from "@renderer/hooks/films/useDeleteFilm";
import { message, Modal } from "antd";

interface DeleteFilmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  filmName: string;
}

const DeleteFilmDialog = ({ open, onOpenChange, id, filmName }: DeleteFilmDialogProps) => {
  const deleteFilm = useDeleteFilm();

  const onOk = () => {
    deleteFilm.mutate(id, {
      onSuccess: () => {
        message.success("Xóa phim thành công");
        onOpenChange(false);
      },
      onError: (error) => {
        message.error(error?.message || "Có lỗi bất thường xảy ra");
      }
    });
  };

  return (
    <Modal
      open={open}
      title="Xác nhận xóa phim"
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true
      }}
      confirmLoading={deleteFilm.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa phim <strong>{filmName}</strong>? Thao tác không thể thu hồi.
    </Modal>
  );
};

export default DeleteFilmDialog;
