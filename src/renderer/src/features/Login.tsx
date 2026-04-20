import { generalDataApi } from "@renderer/api/generalData.api";
import { usersApi } from "@renderer/api/users.api";
import LoginSettingsPopup from "@renderer/components/LoginSettingsPopup";
import { useUpdater } from "@renderer/components/UpdaterContext";
import { usersKeys } from "@renderer/hooks/users/keys";
import { JwtPayload } from "@shared/types";
import { useQueryClient } from "@tanstack/react-query";
import { InfoCircleOutlined } from "@ant-design/icons";
import { Button, Card, Form, Image, Input } from "antd";
import { jwtDecode } from "jwt-decode";
import { LockKeyhole, User2 } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import logo from "../assets/images/logo-3d.png";
import { useLogin } from "../hooks/useLogin";
import { useAuthStore } from "../store/auth.store";
import QuitApp from "@renderer/components/QuitApp";

type LoginForm = {
  username: string;
  password: string;
};

export default function Login() {
  const queryClient = useQueryClient();
  const loginMutation = useLogin();
  const navigate = useNavigate();
  const isAuth = useAuthStore((s) => s.isAuth);
  const { showVersionInfo } = useUpdater();
  const [form] = Form.useForm<LoginForm>();
  const [keyboardInputs, setKeyboardInputs] = useState<LoginForm>({
    username: "",
    password: ""
  });

  useEffect(() => {
    if (isAuth) {
      navigate("/", { replace: true });
    }
  }, [isAuth, navigate]);

  const fieldMeta = useMemo(
    () => ({
      username: {
        label: "Tên đăng nhập",
        icon: <User2 size={16} />,
        placeholder: "Tên đăng nhập"
      },
      password: {
        label: "Mật khẩu",
        icon: <LockKeyhole size={16} />,
        placeholder: "Nhập mật khẩu"
      }
    }),
    []
  );

  const updateFieldValue = (field: keyof LoginForm, value: string) => {
    const nextValues = { ...keyboardInputs, [field]: value };
    setKeyboardInputs(nextValues);
    form.setFieldsValue(nextValues);
    form.validateFields([field]).catch(() => undefined);
  };

  const handleInputChange = (field: keyof LoginForm) => (e: ChangeEvent<HTMLInputElement>) => {
    updateFieldValue(field, e.target.value);
  };

  const onFinish = (values: LoginForm) => {
    loginMutation.mutate(values, {
      onSuccess: async (data) => {
        const decoded = jwtDecode<JwtPayload>(data.access_token);
        const userId = decoded?.user_id;
        await queryClient.prefetchQuery({
          queryKey: usersKeys.getDetail(Number(userId)),
          queryFn: () => usersApi.getDetail(Number(userId))
        });
        await queryClient.prefetchQuery({
          queryKey: ["general-data"],
          queryFn: generalDataApi.get
        });
      }
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-y-auto p-4 xl:p-6">
      <div className="absolute inset-0 z-0 auth-bg bg-cover bg-center bg-no-repeat">
        <div className="absolute inset-0 bg-slate-950/55" />
      </div>
      <div className="absolute top-3 right-4 z-99 text-white space-x-2">
        <LoginSettingsPopup />
        <Button onClick={() => void showVersionInfo()} icon={<InfoCircleOutlined />} />
        <QuitApp />
      </div>
      <Card className="login-card relative z-10 w-full overflow-hidden border-0 shadow-2xl shadow-slate-950/30">
        <div className="grid gap-0">
          <div className="login-card__hero flex flex-col justify-between rounded-lg p-7 text-white xl:p-8">
            <div className="space-y-4">
              <Image width={164} alt="NCC System" src={logo} preview={false} />
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">Đăng nhập hệ thống</h1>
                <p className="max-w-sm text-sm leading-6 text-white/72">
                  Giao diện tối ưu cho máy POS với phím lớn, thao tác nhanh và tập trung vào bảo mật
                  khi nhập tài khoản.
                </p>
              </div>
            </div>
          </div>

          <div className="p-0 pt-4">
            <Form<LoginForm>
              layout="vertical"
              onFinish={onFinish}
              autoComplete="off"
              form={form}
              requiredMark="optional"
              className="space-y-2"
            >
              <Form.Item
                label="Tên đăng nhập"
                name="username"
                rules={[{ required: true, message: "Nhập tên đăng nhập" }]}
              >
                <Input
                  size="large"
                  placeholder={fieldMeta.username.placeholder}
                  autoFocus
                  prefix={fieldMeta.username.icon}
                  value={keyboardInputs.username}
                  onChange={handleInputChange("username")}
                />
              </Form.Item>

              <Form.Item
                label="Mật khẩu"
                name="password"
                rules={[{ required: true, message: "Nhập mật khẩu" }]}
              >
                <Input.Password
                  size="large"
                  placeholder={fieldMeta.password.placeholder}
                  prefix={fieldMeta.password.icon}
                  value={keyboardInputs.password}
                  onChange={handleInputChange("password")}
                />
              </Form.Item>

              <Form.Item shouldUpdate noStyle>
                {() => (
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    className="mt-5 h-12 rounded-xl text-base font-semibold"
                    disabled={form.getFieldsError().some(({ errors }) => errors.length)}
                    loading={loginMutation.isPending}
                  >
                    Đăng nhập
                  </Button>
                )}
              </Form.Item>
            </Form>
          </div>
        </div>
      </Card>
    </div>
  );
}
