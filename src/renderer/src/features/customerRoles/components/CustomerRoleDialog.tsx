import { CustomerRoleDto } from "@renderer/api/customerRoles.api";
import { useCreateCustomerRole } from "@renderer/hooks/customerRoles/useCreateCustomerRole";
import { useUpdateCustomerRole } from "@renderer/hooks/customerRoles/useUpdateCustomerRole";
import { ApiError, CustomerRoleProps } from "@shared/types";
import { Checkbox, Form, Input, Modal, message } from "antd";
import type { FormProps } from "antd";
import axios from "axios";

type FieldType = CustomerRoleDto;

interface CustomerRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCustomerRole?: CustomerRoleProps | null;
}

const CustomerRoleDialog = ({
  open,
  onOpenChange,
  editingCustomerRole
}: CustomerRoleDialogProps) => {
  const [form] = Form.useForm<FieldType>();
  const isEdit = !!editingCustomerRole;

  const createCustomerRole = useCreateCustomerRole();
  const updateCustomerRole = useUpdateCustomerRole();

  const initialValues: FieldType = editingCustomerRole
    ? {
        name: editingCustomerRole.name,
        freeShipping: editingCustomerRole.freeShipping,
        taxExempt: editingCustomerRole.taxExempt,
        active: editingCustomerRole.active,
        isSystemRole: editingCustomerRole.isSystemRole,
        systemName: editingCustomerRole.systemName
      }
    : {
        name: "",
        freeShipping: false,
        taxExempt: false,
        active: true,
        isSystemRole: false,
        systemName: ""
      };

  const onCancel = () => onOpenChange(false);

  const onFinish: FormProps<FieldType>["onFinish"] = (values) => {
    if (!isEdit) {
      createCustomerRole.mutate(values, {
        onSuccess: () => {
          message.success("Thêm nhóm người dùng thành công");
          onCancel();
        },
        onError: (error: unknown) => {
          let msg = "Thêm nhóm người dùng thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
        }
      });
      return;
    }

    updateCustomerRole.mutate(
      {
        id: editingCustomerRole.id,
        dto: values
      },
      {
        onSuccess: () => {
          message.success("Cập nhật nhóm người dùng thành công");
          onCancel();
        },
        onError: (error: unknown) => {
          let msg = "Cập nhật nhóm người dùng thất bại";

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
      title={isEdit ? "Cập nhật nhóm người dùng" : "Thêm nhóm người dùng"}
      onOk={() => form.submit()}
      onCancel={onCancel}
      okButtonProps={{
        loading: createCustomerRole.isPending || updateCustomerRole.isPending
      }}
      cancelButtonProps={{
        disabled: createCustomerRole.isPending || updateCustomerRole.isPending
      }}
      destroyOnHidden
    >
      <Form<FieldType>
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={initialValues}
      >
        <Form.Item<FieldType>
          name="name"
          label="Tên nhóm người dùng"
          rules={[{ required: true, message: "Nhập tên nhóm người dùng" }]}
        >
          <Input placeholder="Nhập tên nhóm người dùng" />
        </Form.Item>

        <Form.Item<FieldType>
          name="systemName"
          label="Tên hệ thống"
          rules={[{ required: true, message: "Nhập tên hệ thống" }]}
        >
          <Input placeholder="Nhập tên hệ thống" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-y-3">
          <Form.Item<FieldType> name="freeShipping" valuePropName="checked" noStyle>
            <Checkbox>Miễn phí vận chuyển</Checkbox>
          </Form.Item>
          <Form.Item<FieldType> name="taxExempt" valuePropName="checked" noStyle>
            <Checkbox>Miễn thuế</Checkbox>
          </Form.Item>
          <Form.Item<FieldType> name="active" valuePropName="checked" noStyle>
            <Checkbox>Kích hoạt</Checkbox>
          </Form.Item>
          <Form.Item<FieldType> name="isSystemRole" valuePropName="checked" noStyle>
            <Checkbox>Nhóm hệ thống</Checkbox>
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default CustomerRoleDialog;
