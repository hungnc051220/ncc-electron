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
import {
  ArrowRight,
  Clapperboard,
  LockKeyhole,
  ShieldCheck,
  TicketCheck,
  User2,
  Zap
} from "lucide-react";
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
    <div className="relative flex min-h-screen items-center justify-center overflow-y-auto px-4 pb-4 pt-16 md:h-screen md:min-h-0 md:overflow-hidden md:p-4">
      <div className="absolute inset-0 z-0 auth-bg bg-cover bg-center bg-no-repeat">
        <div className="absolute inset-0 bg-slate-950/62" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(70,79,180,0.34),transparent_34%),radial-gradient(circle_at_82%_78%,rgba(14,165,233,0.2),transparent_30%)]" />
      </div>
      <div className="absolute top-3 right-4 z-99 flex items-center gap-0.5 rounded-xl border border-white/15 bg-slate-950/35 p-1 text-sm text-white shadow-[0_16px_45px_-20px_rgba(2,6,23,0.9)] backdrop-blur-xl">
        <LoginSettingsPopup
          showLabel
          className="h-8 rounded-lg px-2.5 text-white! hover:bg-white/12! hover:text-white!"
        />
        <Button
          type="text"
          onClick={() => void showVersionInfo()}
          icon={<InfoCircleOutlined />}
          aria-label="Xem thông tin phiên bản"
          className="h-8 rounded-lg px-2.5 text-white! hover:bg-white/12! hover:text-white!"
        >
          Phiên bản
        </Button>
        <div className="mx-1 h-5 w-px bg-white/15" aria-hidden />
        <QuitApp
          showLabel
          className="h-8 rounded-lg px-2.5 text-rose-200! hover:bg-rose-500/18! hover:text-rose-100!"
        />
      </div>
      <Card
        variant="borderless"
        className="login-card relative z-10 w-full overflow-hidden shadow-2xl shadow-slate-950/35"
        classNames={{ body: "p-2!" }}
      >
        <div className="grid min-h-145 gap-0 md:h-[calc(100vh-32px)] md:max-h-130 md:min-h-0 md:grid-cols-[1.08fr_0.92fr]">
          <section className="login-card__hero relative flex min-h-105 flex-col justify-between overflow-hidden rounded-xl p-7 text-white sm:p-9 md:min-h-0 md:p-7">
            <div
              className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border border-white/10 bg-white/5"
              aria-hidden
            />
            <div className="relative z-10">
              <div className="inline-flex items-center rounded-xl border border-white/12 bg-white/8 px-3 py-1.5 backdrop-blur-sm">
                <Image width={132} alt="NCC System" src={logo} preview={false} />
              </div>

              <div className="mt-7 max-w-lg">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-100">
                  <Clapperboard className="size-3.5" aria-hidden />
                  Hệ thống quản lý Rạp Chiếu Phim Quốc Gia
                </div>
                <h1 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
                  Điều hành rạp chiếu trong một không gian thống nhất.
                </h1>
                <p className="mt-4 max-w-md text-sm leading-6 text-white/70 sm:text-base">
                  Quản lý suất chiếu, bán vé và vận hành tại quầy nhanh chóng, chính xác và an toàn.
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-7 grid gap-2.5 sm:grid-cols-3">
              {[
                { icon: TicketCheck, label: "Bán vé nhanh" },
                { icon: Zap, label: "Vận hành liền mạch" },
                { icon: ShieldCheck, label: "Dữ liệu an toàn" }
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/6 px-2.5 py-3 text-xs font-medium text-white/88 backdrop-blur-sm xl:text-sm"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-cyan-200">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="flex items-center px-5 py-8 sm:px-9 lg:px-10 xl:px-12">
            <div className="mx-auto w-full max-w-sm">
              <div className="mb-6">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  Chào mừng trở lại
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Đăng nhập để bắt đầu phiên làm việc.
                </p>
              </div>

              <Form<LoginForm>
                layout="vertical"
                onFinish={onFinish}
                autoComplete="off"
                form={form}
                requiredMark="optional"
                className="space-y-1"
              >
                <Form.Item
                  label="Tên đăng nhập"
                  name="username"
                  rules={[{ required: true, message: "Nhập tên đăng nhập" }]}
                >
                  <Input
                    size="large"
                    variant="filled"
                    placeholder={fieldMeta.username.placeholder}
                    autoFocus
                    prefix={fieldMeta.username.icon}
                    value={keyboardInputs.username}
                    onChange={handleInputChange("username")}
                    className="h-12 rounded-xl"
                  />
                </Form.Item>

                <Form.Item
                  label="Mật khẩu"
                  name="password"
                  rules={[{ required: true, message: "Nhập mật khẩu" }]}
                >
                  <Input.Password
                    size="large"
                    variant="filled"
                    placeholder={fieldMeta.password.placeholder}
                    prefix={fieldMeta.password.icon}
                    value={keyboardInputs.password}
                    onChange={handleInputChange("password")}
                    className="h-12 rounded-xl"
                  />
                </Form.Item>

                <Form.Item shouldUpdate noStyle>
                  {() => (
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      block
                      icon={
                        <ArrowRight
                          className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transform-none"
                          aria-hidden
                        />
                      }
                      iconPlacement="end"
                      className="group mt-5 h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20"
                      disabled={form.getFieldsError().some(({ errors }) => errors.length)}
                      loading={loginMutation.isPending}
                    >
                      Đăng nhập
                    </Button>
                  )}
                </Form.Item>
              </Form>

              <div className="mt-7 flex items-center justify-center gap-2 border-t border-slate-200/80 pt-5 text-xs text-slate-500 dark:border-app-border dark:text-slate-400">
                <ShieldCheck
                  className="size-4 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                />
                <span>Phiên đăng nhập được bảo vệ trên thiết bị này</span>
              </div>
            </div>
          </section>
        </div>
      </Card>
    </div>
  );
}
