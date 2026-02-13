import { Button, Card, Form, Image, Input } from "antd";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useLogin } from "../hooks/useLogin";
import { useAuthStore } from "../store/auth.store";
import logo from "../assets/images/logo-text.png";
import { useQueryClient } from "@tanstack/react-query";
import { generalDataApi } from "@renderer/api/generalData.api";
import { usersKeys } from "@renderer/hooks/users/keys";
import { usersApi } from "@renderer/api/users.api";
import { jwtDecode } from "jwt-decode";
import { JwtPayload } from "@renderer/types";

type LoginForm = {
  username: string;
  password: string;
};

export default function Login() {
  const queryClient = useQueryClient();
  const loginMutation = useLogin();
  const navigate = useNavigate();
  const isAuth = useAuthStore((s) => s.isAuth);
  const [form] = Form.useForm<LoginForm>();

  useEffect(() => {
    if (isAuth) {
      navigate("/", { replace: true });
    }
  }, [isAuth, navigate]);

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
    <div className="h-screen relative flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0 auth-bg bg-cover bg-center bg-no-repeat">
        <div className="absolute inset-0 bg-black/40" />
      </div>
      <Card className="max-w-md w-full">
        <div className="flex flex-col items-center mb-4 space-y-2">
          <Image width={144} alt="basic" src={logo} preview={false} />
          <h1 className="text-3xl font-bold text-foreground">Đăng nhập</h1>
          <p className="text-muted-foreground">Đăng nhập với bàn phím ảo bảo mật</p>
        </div>

        <Form<LoginForm>
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
          form={form}
          requiredMark="optional"
        >
          <Form.Item
            label="Tên đăng nhập"
            name="username"
            rules={[{ required: true, message: "Nhập tên đăng nhập" }]}
          >
            <Input size="large" placeholder="Tên đăng nhập" autoFocus />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: "Nhập mật khẩu" }]}
          >
            <Input.Password size="large" placeholder="Nhập mật khẩu" />
          </Form.Item>

          <Form.Item shouldUpdate>
            {() => (
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                disabled={
                  !form.isFieldsTouched(true) ||
                  form.getFieldsError().some(({ errors }) => errors.length)
                }
                loading={loginMutation.isPending}
              >
                Đăng nhập
              </Button>
            )}
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
