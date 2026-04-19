import { CustomerRoleDto } from "@renderer/api/customerRoles.api";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { useCreateCustomerRole } from "@renderer/hooks/customerRoles/useCreateCustomerRole";
import { useUpdateCustomerRole } from "@renderer/hooks/customerRoles/useUpdateCustomerRole";
import { CustomerRoleProps } from "@shared/types";
import { Checkbox, Form, Input, Modal } from "antd";
import type { FormProps } from "antd";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

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
  const { message } = useAntdApp();

  const [form] = Form.useForm<FieldType>();
  const isEdit = !!editingCustomerRole;

  const createCustomerRole = useCreateCustomerRole();
  const updateCustomerRole = useUpdateCustomerRole();

  const initialValues: FieldType = editingCustomerRole
    ? {
        name: editingCustomerRole.name,
        systemName: editingCustomerRole.systemName,
        active: editingCustomerRole.active
      }
    : {
        name: "",
        active: true,
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
          message.error(getApiErrorMessage(error, "Thêm nhóm người dùng thất bại"));
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
          message.error(getApiErrorMessage(error, "Cập nhật nhóm người dùng thất bại"));
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
          <Form.Item<FieldType> name="active" valuePropName="checked" noStyle>
            <Checkbox>Kích hoạt</Checkbox>
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default CustomerRoleDialog;
