import { useDeleteFilm } from "@renderer/hooks/films/useDeleteFilm";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { Modal } from "antd";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

interface DeleteFilmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  filmName: string;
}

const DeleteFilmDialog = ({ open, onOpenChange, id, filmName }: DeleteFilmDialogProps) => {
  const { message } = useAntdApp();

  const deleteFilm = useDeleteFilm();

  const onOk = () => {
    deleteFilm.mutate(id, {
      onSuccess: () => {
        message.success("Xóa phim thành công");
        onOpenChange(false);
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Xóa phim thất bại"));
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
