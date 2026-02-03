"use client";

import { formatter } from "@/lib/utils";
import { OrderResponseProps } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormProps } from "antd";
import { Form, Input, InputNumber, Modal } from "antd";
import axios from "axios";
import { toast } from "sonner";

type FieldType = {
  customerFirstName: string;
  customerPhone: string;
  orderTotal: number;
};

interface CancellationReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem?: OrderResponseProps | null;
}

const CancellationReasonDialog = ({
  open,
  onOpenChange,
  selectedItem,
}: CancellationReasonDialogProps) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = !!selectedItem;

  const contractTicketSaleMutation = useMutation({
    mutationFn: (data: FieldType) => {
      if (!isEdit) {
        return axios.post("/api/contract-ticket-sales/create", {
          ...data,
        });
      } else {
        return axios.post("/api/contract-ticket-sales/update", {
          ...data,
          id: selectedItem.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-ticket-sales"] });
      toast.success(
        `${isEdit ? "Cập nhật" : "Thêm"} vé bán hợp đồng thành công`,
      );
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  const onOk = () => form.submit();

  const getInitialValues = (): FieldType | undefined => {
    if (!selectedItem) return undefined;
    return {
      customerFirstName: selectedItem.customerFirstName,
      customerPhone: selectedItem.customerPhone,
      orderTotal: selectedItem.orderTotal,
    };
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    contractTicketSaleMutation.mutate(values);
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Cập nhật vé bán hợp đồng" : "Thêm mới vé bán hợp đồng"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: contractTicketSaleMutation.isPending,
      }}
      cancelButtonProps={{
        disabled: contractTicketSaleMutation.isPending,
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
          name="customerFirstName"
          label="Tên khách hàng"
          rules={[{ required: true, message: "Nhập tên khách hàng" }]}
        >
          <Input placeholder="Nhập tên khách hàng" />
        </Form.Item>
        <Form.Item<FieldType>
          name="customerPhone"
          label="Số điện thoại"
          rules={[{ required: true, message: "Nhập số điện thoại" }]}
        >
          <Input placeholder="Nhập số điện thoại" />
        </Form.Item>
        <Form.Item<FieldType>
          name="orderTotal"
          label="Giá trị hợp đồng"
          rules={[{ required: true, message: "Nhập giá trị hợp đồng" }]}
        >
          <InputNumber
            min={0}
            placeholder="Nhập giá trị hợp đồng"
            className="w-full"
            suffix="đ"
            formatter={formatter}
            parser={(value) =>
              value?.replace(/\$\s?|(,*)/g, "") as unknown as number
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CancellationReasonDialog;
