import { useDeletePlanCinema } from "@renderer/hooks/planCinemas/useDeletePlanCinema";
import { ApiError, PlanCinemaProps } from "@renderer/types";
import { message, Modal } from "antd";
import axios from "axios";

interface DeletePlanCinemaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  name: string;
  setSelectedPlan: (plan: PlanCinemaProps | undefined) => void;
}

const DeletePlanCinemaDialog = ({
  open,
  onOpenChange,
  id,
  name,
  setSelectedPlan
}: DeletePlanCinemaDialogProps) => {
  const deletePlanCinema = useDeletePlanCinema();

  const onOk = () => {
    deletePlanCinema.mutate(id, {
      onSuccess: () => {
        message.success("Xóa kế hoạch chiếu phim thành công");
        setSelectedPlan(undefined);
        onOpenChange(false);
      },
      onError: (error: unknown) => {
        let msg = "Xóa kế hoạch chiếu phim thất bại";

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
      title="Xác nhận xóa kế hoạch chiếu phim"
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        danger: true
      }}
      confirmLoading={deletePlanCinema.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn xóa kế hoạch <strong>{name}</strong>? Thao tác không thể thu hồi.
    </Modal>
  );
};

export default DeletePlanCinemaDialog;
