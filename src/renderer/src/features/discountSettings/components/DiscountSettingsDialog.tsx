import { useCreateDiscount } from "@renderer/hooks/discounts/useCreateDiscount";
import { useUpdateDiscount } from "@renderer/hooks/discounts/useUpdateDiscount";
import { formatter } from "@renderer/lib/utils";
import { ApiError, DiscountProps } from "@shared/types";
import type { FormProps } from "antd";
import { Form, Input, InputNumber, message, Modal, Select } from "antd";
import axios from "axios";

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
  editingDiscount
}: DiscountSettingsDialogProps) => {
  const [form] = Form.useForm();
  const isEdit = !!editingDiscount;

  const discountTypeValue = Form.useWatch("discountType", form);

  const createDiscount = useCreateDiscount();
  const updateDiscount = useUpdateDiscount();
  const onOk = () => form.submit();
  const onCancel = () => onOpenChange(false);

  const getInitialValues = (): FieldType | undefined => {
    if (!editingDiscount) {
      return {
        discountName: "",
        discountType: "amount"
      };
    }
    return editingDiscount;
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    if (!isEdit) {
      createDiscount.mutate(values, {
        onSuccess: () => {
          message.success("Thêm giảm giá thành công");
          onCancel();
        },
        onError: (error: unknown) => {
          let msg = "Thêm giảm giá thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
        }
      });
    } else {
      updateDiscount.mutate(
        { id: editingDiscount.id, dto: values },
        {
          onSuccess: () => {
            message.success("Cập nhật giảm giá thành công");
            onCancel();
          },
          onError: (error: unknown) => {
            let msg = "Cập nhật giảm giá thất bại";

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
      title={isEdit ? "Cập nhật giảm giá" : "Thêm mới giảm giá"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: createDiscount.isPending || updateDiscount.isPending
      }}
      cancelButtonProps={{
        disabled: createDiscount.isPending || updateDiscount.isPending
      }}
      width={500}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={getInitialValues()}>
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
            rules={[{ required: true, message: "Nhập tên khuyến mại, giảm giá" }]}
          >
            <Select
              placeholder="Chọn hình thức"
              options={[
                {
                  label: "Theo giá trị",
                  value: "amount"
                },
                {
                  label: "Theo tỷ lệ (%)",
                  value: "rate"
                }
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
                parser={(value) => value?.replace(/\$\s?|(,*)/g, "") as unknown as number}
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
