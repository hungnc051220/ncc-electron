import { useDeleteHoliday } from "@renderer/hooks/holidays/useDeleteHoliday";
import { ApiError } from "@shared/types";
import { message, Modal } from "antd";
import axios from "axios";
import dayjs from "dayjs";

interface DeleteHolidayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
  date: string;
}

const DeleteHolidayDialog = ({ open, onOpenChange, id, date }: DeleteHolidayDialogProps) => {
  const deleteHoliday = useDeleteHoliday();

  const onOk = () => {
    deleteHoliday.mutate(id, {
      onSuccess: () => {
        message.success("Xóa ngày thành công");
        onOpenChange(false);
      },
      onError: (error: unknown) => {
        let msg = "Xóa ngày thất bại";

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
      title="Xác nhận xóa ngày"
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true
      }}
      confirmLoading={deleteHoliday.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa ngày <strong>{dayjs(date).format("DD/MM/YYYY")}</strong>? Thao tác
      không thể thu hồi.
    </Modal>
  );
};

export default DeleteHolidayDialog;
