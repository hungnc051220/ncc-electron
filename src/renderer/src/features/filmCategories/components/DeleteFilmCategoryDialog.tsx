import { useDeleteFilmCategory } from "@renderer/hooks/filmCategories/useDeleteFilmCategory";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { message, Modal } from "antd";

interface DeleteFilmCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
}

const DeleteFilmCategoryDialog = ({
  open,
  onOpenChange,
  id,
  name
}: DeleteFilmCategoryDialogProps) => {
  const deleteFilmCategory = useDeleteFilmCategory();

  const onOk = () => {
    deleteFilmCategory.mutate(id, {
      onSuccess: () => {
        message.success("Xóa thể loại phim thành công");
        onOpenChange(false);
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Xóa thể loại phim thất bại"));
      }
    });
  };

  return (
    <Modal
      open={open}
      title="Xác nhận xóa thể loại phim"
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true
      }}
      confirmLoading={deleteFilmCategory.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa thể loại phim <strong>{name}</strong>? Thao tác không thể thu hồi.
    </Modal>
  );
};

export default DeleteFilmCategoryDialog;
