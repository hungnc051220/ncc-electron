import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import type { UploadRequestOption } from "@rc-component/upload/lib/interface";
import { useCreateDiscount } from "@renderer/hooks/discounts/useCreateDiscount";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { useUpdateDiscount } from "@renderer/hooks/discounts/useUpdateDiscount";
import { useUploadImage } from "@renderer/hooks/useUploadImage";
import { formatter } from "@renderer/lib/utils";
import { DiscountProps } from "@shared/types";
import type { FormProps, GetProp, UploadProps } from "antd";
import { DatePicker, Form, Image, Input, InputNumber, Modal, Select, Upload } from "antd";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { rangePresets } from "@renderer/lib/dateRangePresets";
import type { Dayjs } from "dayjs";

const { RangePicker } = DatePicker;

type FileType = Parameters<GetProp<UploadProps, "beforeUpload">>[0];

type FieldType = {
  discountName: string;
  discountType: string;
  discountAmount?: number;
  discountRate?: number;
  image?: string;
  dateRange?: [string, string];
};

type FormValues = Omit<FieldType, "dateRange"> & {
  dateRange?: [Dayjs, Dayjs];
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
  const { message } = useAntdApp();

  const [form] = Form.useForm<FormValues>();
  const isEdit = !!editingDiscount;

  const discountTypeValue = Form.useWatch("discountType", form);
  const imageUrl = form.getFieldValue("image");

  const createDiscount = useCreateDiscount();
  const updateDiscount = useUpdateDiscount();
  const uploadImage = useUploadImage();
  const onOk = () => form.submit();
  const onCancel = () => onOpenChange(false);

  const getInitialValues = (): FormValues | undefined => {
    if (!editingDiscount) {
      return {
        discountName: "",
        discountType: "amount"
      };
    }
    return editingDiscount;
  };

  const onFinish: FormProps<FormValues>["onFinish"] = (values: FormValues) => {
    if (!isEdit) {
      createDiscount.mutate(values, {
        onSuccess: () => {
          message.success("Thêm giảm giá thành công");
          onCancel();
        },
        onError: (error: unknown) => {
          message.error(getApiErrorMessage(error, "Thêm giảm giá thất bại"));
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
            message.error(getApiErrorMessage(error, "Cập nhật giảm giá thất bại"));
          }
        }
      );
    }
  };

  const handleUpload = async (options: UploadRequestOption) => {
    const { file, onSuccess, onError } = options;

    try {
      if (!(file instanceof File)) {
        throw new Error("File không hợp lệ");
      }

      const image = await uploadImage.mutateAsync(file);
      form.setFieldValue("image", image);
      onSuccess?.(image);
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Tải ảnh lên thất bại"));
      onError?.(error as Error);
    }
  };

  const beforeUpload = (file: FileType) => {
    const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png";
    if (!isJpgOrPng) {
      message.error("Chỉ có thể tải ảnh dạng JPG/PNG!");
      return Upload.LIST_IGNORE;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error("Ảnh phải nhỏ hơn 5MB!");
      return Upload.LIST_IGNORE;
    }

    return true;
  };

  const uploadButton = (
    <button style={{ border: 0, background: "none" }} type="button">
      {uploadImage.isPending ? <LoadingOutlined /> : <PlusOutlined />}
      <div className="mt-2 text-gray-500">{uploadImage.isPending ? "Đang tải" : "Chọn ảnh"}</div>
    </button>
  );

  return (
    <Modal
      open={open}
      title={isEdit ? "Cập nhật giảm giá" : "Thêm mới giảm giá"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: createDiscount.isPending || updateDiscount.isPending,
        disabled: uploadImage.isPending
      }}
      cancelButtonProps={{
        disabled: createDiscount.isPending || updateDiscount.isPending || uploadImage.isPending
      }}
      width={640}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={getInitialValues()}>
        <Form.Item<FormValues> name="image" hidden />
        <Form.Item<FormValues>
          name="discountName"
          label="Tên khuyến mại, giảm giá"
          rules={[{ required: true, message: "Nhập tên khuyến mại, giảm giá" }]}
        >
          <Input placeholder="Nhập tên khuyến mại, giảm giá" />
        </Form.Item>
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item<FormValues>
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
            <Form.Item<FormValues>
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
            <Form.Item<FormValues>
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

        <Form.Item<FormValues> name="dateRange" label="Khoảng thời gian">
          <RangePicker className="w-full" presets={rangePresets} format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item<FormValues> label="Ảnh">
          <Upload
            showUploadList={false}
            accept="image/png,image/jpeg"
            listType="picture-card"
            customRequest={handleUpload}
            beforeUpload={beforeUpload}
          >
            {imageUrl ? (
              <Image
                width={140}
                alt="discount image"
                src={imageUrl}
                className="rounded-lg border border-app-border object-cover"
                preview={false}
              />
            ) : (
              uploadButton
            )}
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DiscountSettingsDialog;
