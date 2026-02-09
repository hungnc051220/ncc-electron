"use client";

import { useDeleteHoliday } from "@renderer/hooks/holidays/useDeleteHoliday";
import { message, Modal } from "antd";
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
      onError: (error) => {
        message.error(error?.message || "Có lỗi bất thường xảy ra");
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
