import { useDeletePlanCinema } from "@renderer/hooks/planCinemas/useDeletePlanCinema";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { PlanCinemaProps } from "@shared/types";
import { message, Modal } from "antd";

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
        message.error(getApiErrorMessage(error, "Xóa kế hoạch chiếu phim thất bại"));
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
