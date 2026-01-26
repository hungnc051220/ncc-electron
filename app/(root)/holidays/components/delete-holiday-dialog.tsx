"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { toast } from "sonner";

interface DeleteHolidayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
  date: string;
}

const DeleteHolidayDialog = ({
  open,
  onOpenChange,
  id,
  date,
}: DeleteHolidayDialogProps) => {
  const queryClient = useQueryClient();

  const deleteFilmMutation = useMutation({
    mutationFn: () => {
      return axios.post("/api/holidays/delete", {
        id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("Xóa ngày thành công");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  return (
    <Modal
      open={open}
      title="Xác nhận xóa ngày"
      onOk={() => deleteFilmMutation.mutate()}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true,
      }}
      confirmLoading={deleteFilmMutation.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa ngày{" "}
      <strong>{dayjs(date).format("DD/MM/YYYY")}</strong>? Thao tác không thể
      thu hồi.
    </Modal>
  );
};

export default DeleteHolidayDialog;
