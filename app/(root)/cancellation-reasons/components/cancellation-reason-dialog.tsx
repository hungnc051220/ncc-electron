"use client";

import { CancellationReasonProps } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormProps } from "antd";
import { Form, Input, Modal } from "antd";
import axios from "axios";
import { toast } from "sonner";

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
  editingCancellationReason,
}: CancellationReasonDialogProps) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = !!editingCancellationReason;

  const cancellationReasonMutation = useMutation({
    mutationFn: (data: FieldType) => {
      if (!isEdit) {
        return axios.post("/api/cancellation-reasons/create", {
          ...data,
        });
      } else {
        return axios.post("/api/cancellation-reasons/update", {
          ...data,
          id: editingCancellationReason.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cancellation-reasons"] });
      toast.success(`${isEdit ? "Cập nhật" : "Thêm"} lý do hủy vé thành công`);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  const onOk = () => form.submit();

  const getInitialValues = (): FieldType | undefined => {
    if (!editingCancellationReason) {
      return {
        reason: "",
      };
    }
    return {
      reason: editingCancellationReason.reason,
    };
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    cancellationReasonMutation.mutate(values);
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Cập nhật lý do hủy" : "Thêm mới lý do hủy"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: cancellationReasonMutation.isPending,
      }}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={getInitialValues()}
      >
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
