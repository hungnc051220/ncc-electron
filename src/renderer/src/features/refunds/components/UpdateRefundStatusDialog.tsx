import { useUpdateRefundStatusOrder } from "@renderer/hooks/orders/useUpdateRefundStatusOrder";
import { ApiError, OrderDetailProps, RefundStatus } from "@shared/types";
import type { FormProps } from "antd";
import { Form, message, Modal, Select } from "antd";
import axios from "axios";

interface UpdateRefundStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem?: OrderDetailProps | null;
}

interface UpdateRefundStatusFormValues {
  refundStatusId: RefundStatus;
}

const refundStatusOptions = [
  { label: "Chờ xử lý", value: RefundStatus.PENDING },
  { label: "Hoàn online", value: RefundStatus.ONLINE },
  { label: "Hoàn tiền mặt", value: RefundStatus.CASH }
];

const UpdateRefundStatusDialog = ({
  open,
  onOpenChange,
  selectedItem
}: UpdateRefundStatusDialogProps) => {
  const [form] = Form.useForm<UpdateRefundStatusFormValues>();
  const updateRefundStatusOrder = useUpdateRefundStatusOrder();

  const onOk = () => form.submit();
  const onCancel = () => onOpenChange(false);

  const getInitialValues = (): UpdateRefundStatusFormValues => ({
    refundStatusId: selectedItem?.order.refundStatusId ?? RefundStatus.PENDING
  });

  const onFinish: FormProps<UpdateRefundStatusFormValues>["onFinish"] = (values) => {
    if (!selectedItem) return;

    updateRefundStatusOrder.mutate(
      {
        id: selectedItem.order.id,
        RefundStatusId: values.refundStatusId
      },
      {
        onSuccess: () => {
          message.success("Cập nhật trạng thái hoàn tiền thành công");
          onCancel();
        },
        onError: (error: unknown) => {
          let msg = "Cập nhật trạng thái hoàn tiền thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
        }
      }
    );
  };

  return (
    <Modal
      open={open}
      title="Cập nhật trạng thái hủy"
      onOk={onOk}
      onCancel={onCancel}
      okText="Cập nhật"
      cancelText="Đóng"
      okButtonProps={{
        loading: updateRefundStatusOrder.isPending
      }}
      cancelButtonProps={{
        disabled: updateRefundStatusOrder.isPending
      }}
      width={420}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={getInitialValues()}>
        <Form.Item<UpdateRefundStatusFormValues>
          name="refundStatusId"
          label="Trạng thái"
          rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
        >
          <Select options={refundStatusOptions} placeholder="Chọn trạng thái" className="w-full" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UpdateRefundStatusDialog;
