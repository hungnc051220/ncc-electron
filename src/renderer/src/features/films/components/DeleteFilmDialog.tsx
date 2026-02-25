import { useDeleteFilm } from "@renderer/hooks/films/useDeleteFilm";
import { ApiError } from "@shared/types";
import { message, Modal } from "antd";
import axios from "axios";

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
      onError: (error: unknown) => {
        let msg = "Xóa phim thất bại";

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
