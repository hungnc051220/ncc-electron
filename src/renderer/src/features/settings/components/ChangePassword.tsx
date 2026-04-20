import {
  InfoCircleOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined
} from "@ant-design/icons";
import { useCustomerRoles } from "@renderer/hooks/customerRoles/useCustomerRoles";
import { useChangePasswordUser } from "@renderer/hooks/users/useChangePasswordUser";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { useAuthStore } from "@renderer/store/auth.store";
import type { FormProps } from "antd";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Skeleton,
  Typography
} from "antd";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

type FieldType = {
  password: string;
  new_password: string;
};

const { Paragraph, Text, Title } = Typography;

const ChangePassword = () => {
  const { message } = useAntdApp();

  const [form] = Form.useForm<FieldType>();
  const logout = useAuthStore((s) => s.logout);
  const userId = useAuthStore((s) => s.userId);
  const changePassword = useChangePasswordUser();
  const { data: user, isLoading } = useUserDetail(userId ?? 0);
  const { data: customerRoles } = useCustomerRoles();

  const roleNames =
    user?.roleIds
      ?.split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => !Number.isNaN(item))
      .map((roleId) => customerRoles?.find((role) => role.id === roleId)?.name)
      .filter(Boolean) ?? [];

  const onFinish: FormProps<FieldType>["onFinish"] = (values) => {
    changePassword.mutate(values, {
      onSuccess: () => {
        form.resetFields();
        message.success("Đổi mật khẩu thành công. Vui lòng đăng nhập lại");
        logout();
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Đổi mật khẩu thất bại"));
      }
    });
  };

  return (
    <>
      <div className="space-y-5 py-1">
        <div>
          <Title level={3} className="mb-1!">
            Cấu hình tài khoản
          </Title>
          <Paragraph type="secondary" className="mb-0!">
            Quản lý thông tin đăng nhập và cập nhật mật khẩu cho tài khoản đang sử dụng.
          </Paragraph>
        </div>

        <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] 2xl:items-stretch">
          <Card className="h-full">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <Avatar
                  size={56}
                  icon={<UserOutlined />}
                  className="shrink-0 bg-slate-100! text-slate-600! dark:bg-slate-800! dark:text-slate-200!"
                />
                <div className="min-w-0">
                  <Title level={4} className="mb-1!">
                    Thông tin tài khoản
                  </Title>
                  <Text type="secondary">Thông tin cơ bản của tài khoản đang đăng nhập.</Text>
                </div>
              </div>

              <div className="w-full sm:w-auto">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 dark:border-emerald-900/70 dark:bg-emerald-950/40 sm:min-w-55">
                  <Text type="secondary" className="block text-xs uppercase tracking-[0.18em]">
                    Trạng thái tài khoản
                  </Text>
                  <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <Badge status={user?.isHidden ? "default" : "success"} />
                    {user?.isHidden ? "Đang ẩn" : "Đang hoạt động"}
                  </div>
                </div>
              </div>
            </div>

            {isLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-app-border dark:bg-app-bg/70">
                  <Text type="secondary" className="mb-2 block text-xs uppercase tracking-[0.16em]">
                    Họ và tên
                  </Text>
                  <p className="mb-0 wrap-break-word text-base font-semibold text-slate-800 dark:text-slate-100">
                    {user?.fullname || "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-app-border dark:bg-app-bg/70">
                  <Text type="secondary" className="mb-2 block text-xs uppercase tracking-[0.16em]">
                    Tên đăng nhập
                  </Text>
                  <p className="mb-0 break-all text-base font-semibold text-slate-800 dark:text-slate-100">
                    {user?.username || "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-app-border dark:bg-app-bg/70">
                  <Text type="secondary" className="mb-2 block text-xs uppercase tracking-[0.16em]">
                    Email
                  </Text>
                  <div className="flex items-start gap-2">
                    <MailOutlined className="mt-1 text-slate-400 dark:text-slate-500" />
                    <p className="mb-0 min-w-0 break-all text-base font-medium text-slate-700 dark:text-slate-200">
                      {user?.email || "-"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-app-border dark:bg-app-bg/70">
                  <Text type="secondary" className="mb-2 block text-xs uppercase tracking-[0.16em]">
                    Số điện thoại
                  </Text>
                  <div className="flex items-start gap-2">
                    <PhoneOutlined className="mt-1 text-slate-400 dark:text-slate-500" />
                    <p className="mb-0 wrap-break-word text-base font-medium text-slate-700 dark:text-slate-200">
                      {user?.mobile || "-"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-app-border dark:bg-app-bg/70 xl:col-span-2">
                  <Text type="secondary" className="mb-2 block text-xs uppercase tracking-[0.16em]">
                    Địa chỉ
                  </Text>
                  <p className="mb-0 wrap-break-word text-base font-medium text-slate-700 dark:text-slate-200">
                    {user?.address || "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-app-border dark:bg-app-bg/70 xl:col-span-2">
                  <Text type="secondary" className="mb-2 block text-xs uppercase tracking-[0.16em]">
                    Nhóm người dùng
                  </Text>
                  {roleNames.length ? (
                    <div className="flex flex-wrap gap-2">
                      {roleNames.map((roleName) => (
                        <span
                          key={roleName}
                          className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200"
                        >
                          {roleName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mb-0 wrap-break-word text-base font-medium text-slate-700 dark:text-slate-200">
                      -
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>

          <Card className="h-full">
            <div className="mb-4 flex items-start gap-3">
              <Avatar
                size={44}
                icon={<LockOutlined />}
                className="shrink-0 bg-amber-50! text-amber-600! dark:bg-amber-950/50! dark:text-amber-200!"
              />
              <div>
                <Title level={4} className="mb-1!">
                  Đổi mật khẩu
                </Title>
                <Text type="secondary">
                  Cập nhật mật khẩu mới để tăng độ an toàn cho tài khoản.
                </Text>
              </div>
            </div>

            <Alert
              className="mb-4"
              type="info"
              showIcon
              title="Sau khi đổi mật khẩu thành công, hệ thống sẽ đăng xuất để bạn đăng nhập lại."
            />

            <Form<FieldType>
              form={form}
              name="account-settings"
              onFinish={onFinish}
              autoComplete="off"
              layout="vertical"
              className="flex h-full flex-col"
            >
              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item<FieldType>
                    label="Mật khẩu hiện tại"
                    name="password"
                    rules={[{ required: true, message: "Nhập mật khẩu hiện tại" }]}
                  >
                    <Input.Password placeholder="Nhập mật khẩu hiện tại" />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item<FieldType>
                    label="Mật khẩu mới"
                    name="new_password"
                    rules={[{ required: true, message: "Nhập mật khẩu mới" }]}
                  >
                    <Input.Password placeholder="Nhập mật khẩu mới" />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <div className="rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50 to-orange-50 p-4 dark:border-amber-900/60 dark:from-amber-950/40 dark:to-orange-950/20">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200">
                        <InfoCircleOutlined />
                      </div>
                      <div className="min-w-0">
                        <Text className="block text-sm leading-6 text-amber-800 dark:text-amber-200">
                          Mật khẩu nên có ít nhất 8 ký tự và kết hợp chữ, số hoặc ký tự đặc biệt để
                          tăng độ bảo mật.
                        </Text>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>

              <Form.Item label={null} className="mb-0! mt-4 flex justify-end">
                <Button type="primary" htmlType="submit" loading={changePassword.isPending}>
                  Cập nhật mật khẩu
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ChangePassword;
