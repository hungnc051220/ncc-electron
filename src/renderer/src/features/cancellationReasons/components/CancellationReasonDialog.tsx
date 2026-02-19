import { useCreateCancellationReason } from "@renderer/hooks/cancellationReasons/useCreateCancellationReason";
import { useUpdateCancellationReason } from "@renderer/hooks/cancellationReasons/useUpdateCancellationReason";
import { ApiError, CancellationReasonProps } from "@shared/types";
import type { FormProps } from "antd";
import { Form, Input, message, Modal } from "antd";
import axios from "axios";

type FieldType = {
  reason: string;
};

interface CancellationReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCancellationReason?: CancellationReasonProps | null;
}

const CancellationReasonDialog = ({
  open,
  onOpenChange,
  editingCancellationReason
}: CancellationReasonDialogProps) => {
  const [form] = Form.useForm();
  const isEdit = !!editingCancellationReason;

  const createCancellationReason = useCreateCancellationReason();
  const updateCancellationReason = useUpdateCancellationReason();

  const onOk = () => form.submit();
  const onCancel = () => onOpenChange(false);

  const getInitialValues = (): FieldType | undefined => {
    if (!editingCancellationReason) {
      return {
        reason: ""
      };
    }
    return {
      reason: editingCancellationReason.reason
    };
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    if (!isEdit) {
      createCancellationReason.mutate(values, {
        onSuccess: () => {
          message.success("Thêm lý do hủy vé thành công");
          onCancel();
        },
        onError: (error: unknown) => {
          let msg = "Thêm lý do hủy vé thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
        }
      });
    } else {
      updateCancellationReason.mutate(
        {
          id: editingCancellationReason.id,
          dto: values
        },
        {
          onSuccess: () => {
            message.success("Cập nhật lý do hủy vé thành công");
            onCancel();
          },
          onError: (error: unknown) => {
            let msg = "Cập nhật lý do hủy vé thất bại";

            if (axios.isAxiosError<ApiError>(error)) {
              msg = error.response?.data?.message ?? msg;
            }

            message.error(msg);
          }
        }
      );
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Cập nhật lý do hủy" : "Thêm mới lý do hủy"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: createCancellationReason.isPending || updateCancellationReason.isPending
      }}
      cancelButtonProps={{
        disabled: createCancellationReason.isPending || updateCancellationReason.isPending
      }}
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={getInitialValues()}>
        <Form.Item<FieldType>
          name="reason"
          label="Lý do hủy"
          rules={[{ required: true, message: "Nhập lý do hủy" }]}
        >
          <Input placeholder="Nhập lý do hủy" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CancellationReasonDialog;
