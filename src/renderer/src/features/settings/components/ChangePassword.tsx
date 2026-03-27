import { useChangePasswordUser } from "@renderer/hooks/users/useChangePasswordUser";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { usePermission } from "@renderer/permissions/usePermission";
import { useAuthStore } from "@renderer/store/auth.store";
import type { FormProps } from "antd";
import { Button, Form, Input, message } from "antd";

type FieldType = {
  password: string;
  new_password: string;
};

const ChangePassword = () => {
  const logout = useAuthStore((s) => s.logout);
  const changePassword = useChangePasswordUser();
  const { can } = usePermission();
  const canUpdate = can("settings", "update");

  const onFinish: FormProps<FieldType>["onFinish"] = (values) => {
    changePassword.mutate(values, {
      onSuccess: () => {
        message.success("Đổi mật khẩu thành công. Vui lòng đăng nhập lại");
        logout();
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Xóa lý do hủy vé thất bại"));
      }
    });
  };

  return (
    <>
      <h3 className="font-semibold text-xl mb-4">Thay đổi mật khẩu</h3>
      <Form
        name="basic"
        style={{ maxWidth: 600 }}
        initialValues={{ remember: true }}
        onFinish={onFinish}
        autoComplete="off"
        layout="vertical"
      >
        <Form.Item<FieldType>
          label="Mật khẩu cũ"
          name="password"
          rules={[{ required: true, message: "Nhập mật khẩu cũ" }]}
        >
          <Input.Password placeholder="Nhập mật khẩu cũ" />
        </Form.Item>

        <Form.Item<FieldType>
          label="Mật khẩu mới"
          name="new_password"
          rules={[{ required: true, message: "Nhập mật khẩu mới" }]}
        >
          <Input.Password placeholder="Nhập mật khẩu mới" />
        </Form.Item>

        <Form.Item label={null} className="flex justify-end">
          <Button
            type="primary"
            htmlType="submit"
            disabled={changePassword.isPending || !canUpdate}
          >
            Lưu thông tin
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default ChangePassword;
