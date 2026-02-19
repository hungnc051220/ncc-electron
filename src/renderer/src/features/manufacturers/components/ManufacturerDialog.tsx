import { useCreateManufacturer } from "@renderer/hooks/manufacturers/useCreateManufacturer";
import { useUpdateManufacturer } from "@renderer/hooks/manufacturers/useUpdateManufacturer";
import { ApiError, ManufacturerProps } from "@shared/types";
import type { FormProps } from "antd";
import { Form, Input, message, Modal } from "antd";
import axios from "axios";

type FieldType = {
  name: string;
  fullName: string;
  manufacturerTemplateId?: number;
  bankName?: string;
  phoneNumber?: string;
  acountBank?: string;
  addressBank?: string;
  address?: string;
  fax?: string;
  url?: string;
};

interface ManufacturerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingManufacturer?: ManufacturerProps | null;
}

const ManufacturerDialog = ({
  open,
  onOpenChange,
  editingManufacturer
}: ManufacturerDialogProps) => {
  const [form] = Form.useForm();
  const isEdit = !!editingManufacturer;

  const createManufacturer = useCreateManufacturer();
  const updateManufacturer = useUpdateManufacturer();

  const onOk = () => form.submit();
  const onCancel = () => onOpenChange(false);

  const getInitialValues = (): FieldType | undefined => {
    if (!editingManufacturer) {
      return {
        name: "",
        fullName: "",
        manufacturerTemplateId: 1
      };
    }
    return {
      name: editingManufacturer.name,
      fullName: editingManufacturer.fullName,
      bankName: editingManufacturer.bankName,
      phoneNumber: editingManufacturer.phoneNumber,
      acountBank: editingManufacturer.acountBank,
      addressBank: editingManufacturer.addressBank,
      address: editingManufacturer.address,
      fax: editingManufacturer.fax,
      url: editingManufacturer.url,
      manufacturerTemplateId: 1
    };
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    if (!isEdit) {
      createManufacturer.mutate(values, {
        onSuccess: () => {
          message.success("Thêm hãng phim thành công");
          onCancel();
        },
        onError: (error: unknown) => {
          let msg = "Thêm hãng phim thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
        }
      });
    } else {
      updateManufacturer.mutate(
        { id: editingManufacturer.id, dto: values },
        {
          onSuccess: () => {
            message.success("Cập nhật hãng phim thành công");
            onCancel();
          },
          onError: (error: unknown) => {
            let msg = "Cập nhật hãng phim thất bại";

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
      title={isEdit ? "Cập nhật hãng phim" : "Thêm mới hãng phim"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: createManufacturer.isPending || updateManufacturer.isPending
      }}
      cancelButtonProps={{
        disabled: createManufacturer.isPending || updateManufacturer.isPending
      }}
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={getInitialValues()}>
        <div className="grid grid-cols-2 gap-x-4 mt-4">
          <Form.Item<FieldType>
            name="name"
            label="Tên hãng phim"
            rules={[{ required: true, message: "Nhập tên hãng phim" }]}
          >
            <Input placeholder="Nhập tên hãng phim" />
          </Form.Item>
          <Form.Item<FieldType> name="acountBank" label="Tài khoản ngân hàng">
            <Input placeholder="Nhập tài khoản ngân hàng" />
          </Form.Item>

          <Form.Item<FieldType>
            name="fullName"
            label="Tên công ty"
            rules={[{ required: true, message: "Nhập tên công ty" }]}
          >
            <Input placeholder="Nhập tên công ty" />
          </Form.Item>
          <Form.Item<FieldType> name="bankName" label="Tên ngân hàng">
            <Input placeholder="Nhập tên ngân hàng" />
          </Form.Item>
          <Form.Item<FieldType> name="phoneNumber" label="Số điện thoại">
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>
          <Form.Item<FieldType> name="addressBank" label="Địa chỉ ngân hàng">
            <Input placeholder="Nhập địa chỉ ngân hàng" />
          </Form.Item>
          <Form.Item<FieldType> name="address" label="Địa chỉ" className="col-span-2">
            <Input placeholder="Nhập địa chỉ" />
          </Form.Item>
          <Form.Item<FieldType> name="fax" label="Fax" className="col-span-2">
            <Input placeholder="Nhập fax" />
          </Form.Item>
          <Form.Item<FieldType> name="url" label="Website" className="col-span-2">
            <Input placeholder="Nhập website" />
          </Form.Item>
          <Form.Item<FieldType> name="manufacturerTemplateId" hidden />
        </div>
      </Form>
    </Modal>
  );
};

export default ManufacturerDialog;
