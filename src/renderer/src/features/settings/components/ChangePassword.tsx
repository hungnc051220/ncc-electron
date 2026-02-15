import { useChangePasswordUser } from "@renderer/hooks/users/useChangePasswordUser";
import { useAuthStore } from "@renderer/store/auth.store";
import { ApiError } from "@renderer/types";
import type { FormProps } from "antd";
import { Button, Form, Input, message } from "antd";
import axios from "axios";

type FieldType = {
  password: string;
  new_password: string;
};

const ChangePassword = () => {
  const logout = useAuthStore((s) => s.logout);
  const changePassword = useChangePasswordUser();

  const onFinish: FormProps<FieldType>["onFinish"] = (values) => {
    changePassword.mutate(values, {
      onSuccess: () => {
        message.success("Đổi mật khẩu thành công. Vui lòng đăng nhập lại");
        logout();
      },
      onError: (error: unknown) => {
        let msg = "Xóa lý do hủy vé thất bại";

        if (axios.isAxiosError<ApiError>(error)) {
          msg = error.response?.data?.message ?? msg;
        }

        message.error(msg);
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
          <Button type="primary" htmlType="submit" disabled={changePassword.isPending}>
            Lưu thông tin
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default ChangePassword;
