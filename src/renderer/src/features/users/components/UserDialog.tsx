import { useCreateUser } from "@renderer/hooks/users/useCreateUser";
import { useUpdateUser } from "@renderer/hooks/users/useUpdateUser";
import type { FormProps } from "antd";
import { Form, Input, message, Modal, Select } from "antd";
import { ApiError, CustomerRoleProps, ManufacturerProps, UserProps } from "../../../types";
import { UserDto } from "@renderer/api/users.api";
import axios from "axios";
interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser?: UserProps | null;
  customerRoles: CustomerRoleProps[];
  isFetchingCustomerRoles: boolean;
  manufactureres: ManufacturerProps[];
}

const UserDialog = ({
  open,
  onOpenChange,
  editingUser,
  customerRoles,
  isFetchingCustomerRoles,
  manufactureres
}: UserDialogProps) => {
  const [form] = Form.useForm();
  const isEdit = !!editingUser;

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const onOk = () => form.submit();
  const onCancel = () => onOpenChange(false);

  const getInitialValues = (): UserDto | undefined => {
    if (!editingUser) return undefined;
    return {
      roleIds: editingUser.roleIds.split(",").map(Number) || [],
      username: editingUser.username,
      email: editingUser.email,
      manufacturerId: editingUser.manufacturerId,
      customerFirstName: editingUser.customerFirstName,
      address: editingUser.address,
      mobile: editingUser.mobile
    };
  };

  const onFinish: FormProps<UserDto>["onFinish"] = (values: UserDto) => {
    if (!isEdit) {
      createUser.mutate(
        { ...values, confirmPassword: values.password },
        {
          onSuccess: () => {
            message.success("Thêm người dùng thành công");
            onCancel();
          },
          onError: (error: unknown) => {
            let msg = "Thêm người dùng thất bại";

            if (axios.isAxiosError<ApiError>(error)) {
              msg = error.response?.data?.message ?? msg;
            }

            message.error(msg);
          }
        }
      );
    } else {
      updateUser.mutate(
        { id: editingUser.id, dto: values },
        {
          onSuccess: () => {
            message.success("Cập nhật người dùng thành công");
            onCancel();
          },
          onError: (error: unknown) => {
            let msg = "Cập nhật người dùng thất bại";

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
      title={isEdit ? "Cập nhật người dùng" : "Thêm mới người dùng"}
      onOk={onOk}
      onCancel={onCancel}
      okButtonProps={{
        loading: createUser.isPending || updateUser.isPending
      }}
      cancelButtonProps={{
        disabled: createUser.isPending || updateUser.isPending
      }}
      width={876}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={getInitialValues()}>
        <div className="grid grid-cols-2 gap-x-4 mt-4">
          <Form.Item<UserDto>
            name="roleIds"
            label="Nhóm người dùng"
            rules={[{ required: true, message: "Hãy chọn nhóm người dùng" }]}
          >
            <Select
              mode="multiple"
              allowClear
              className="w-full"
              placeholder="Chọn nhóm người dùng"
              options={customerRoles?.map((item) => ({
                value: item.id,
                label: item.name
              }))}
              loading={isFetchingCustomerRoles}
            />
          </Form.Item>

          <Form.Item<UserDto>
            name="customerFirstName"
            label="Họ và tên"
            rules={[{ required: true, message: "Hãy nhập họ và tên" }]}
          >
            <Input placeholder="Nhập họ và tên" />
          </Form.Item>

          <Form.Item name="manufacturerId" label="Hãng phát hành">
            <Select
              allowClear
              className="w-full"
              placeholder="Chọn hãng phát hành"
              options={manufactureres?.map((item) => ({
                value: item.id,
                label: item.fullName
              }))}
            />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input placeholder="Nhập địa chỉ" />
          </Form.Item>
          <Form.Item<UserDto>
            name="email"
            label="Email"
            rules={[{ required: true, message: "Hãy nhập email" }]}
          >
            <Input placeholder="Nhập email" />
          </Form.Item>
          <Form.Item<UserDto>
            name="mobile"
            label="Số điện thoại"
            rules={[{ required: true, message: "Hãy nhập số điện thoại" }]}
          >
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>
          <Form.Item<UserDto>
            name="username"
            label="Tên đăng nhập"
            rules={[{ required: true, message: "Hãy nhập tên đăng nhập" }]}
          >
            <Input placeholder="Nhập tên đăng nhập" />
          </Form.Item>
          <Form.Item<UserDto>
            name="password"
            label="Mật khẩu"
            rules={[{ required: !isEdit, message: "Hãy nhập tên đăng nhập" }]}
          >
            <Input.Password placeholder="Nhập mật khẩu" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default UserDialog;
