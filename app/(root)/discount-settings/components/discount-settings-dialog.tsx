"use client";

import { formatter } from "@/lib/utils";
import { DiscountProps } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormProps } from "antd";
import { Form, Input, InputNumber, Modal, Select } from "antd";
import axios from "axios";
import { toast } from "sonner";

type FieldType = {
  discountName: string;
  discountType: string;
  discountAmount?: number;
  discountRate?: number;
};

interface DiscountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDiscount?: DiscountProps | null;
}

const DiscountSettingsDialog = ({
  open,
  onOpenChange,
  editingDiscount,
}: DiscountSettingsDialogProps) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = !!editingDiscount;

  const discountTypeValue = Form.useWatch("discountType", form);

  const discountMutation = useMutation({
    mutationFn: (data: FieldType) => {
      if (!isEdit) {
        return axios.post("/api/discounts/create", {
          ...data,
        });
      } else {
        return axios.post("/api/discounts/update", {
          ...data,
          id: editingDiscount.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success(`${isEdit ? "Cập nhật" : "Thêm"} giảm giá thành công`);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  const onOk = () => form.submit();

  const getInitialValues = (): FieldType | undefined => {
    if (!editingDiscount) {
      return {
        discountName: "",
        discountType: "amount",
      };
    }
    return editingDiscount;
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    discountMutation.mutate(values);
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Cập nhật giảm giá" : "Thêm mới giảm giá"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: discountMutation.isPending,
      }}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={getInitialValues()}
      >
        <Form.Item<FieldType>
          name="discountName"
          label="Tên khuyến mại, giảm giá"
          rules={[{ required: true, message: "Nhập tên khuyến mại, giảm giá" }]}
        >
          <Input placeholder="Nhập tên khuyến mại, giảm giá" />
        </Form.Item>
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item<FieldType>
            name="discountType"
            label="Hình thức"
            rules={[
              { required: true, message: "Nhập tên khuyến mại, giảm giá" },
            ]}
          >
            <Select
              placeholder="Chọn hình thức"
              options={[
                {
                  label: "Theo giá trị",
                  value: "amount",
                },
                {
                  label: "Theo tỷ lệ (%)",
                  value: "rate",
                },
              ]}
            />
          </Form.Item>
          {discountTypeValue === "amount" ? (
            <Form.Item<FieldType>
              name="discountAmount"
              label="Giá trị"
              rules={[{ required: true, message: "Nhập giá trị" }]}
            >
              <InputNumber
                placeholder="Nhập giá trị"
                min={0}
                className="w-full"
                suffix="đ"
                formatter={formatter}
                parser={(value) =>
                  value?.replace(/\$\s?|(,*)/g, "") as unknown as number
                }
              />
            </Form.Item>
          ) : (
            <Form.Item<FieldType>
              name="discountRate"
              label="Giá trị"
              rules={[{ required: true, message: "Nhập giá trị" }]}
            >
              <InputNumber
                placeholder="Nhập giá trị"
                min={0}
                max={100}
                className="w-full"
                suffix="%"
              />
            </Form.Item>
          )}
        </div>
      </Form>
    </Modal>
  );
};

export default DiscountSettingsDialog;
