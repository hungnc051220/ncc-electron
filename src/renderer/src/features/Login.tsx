import { generalDataApi } from "@renderer/api/generalData.api";
import { usersApi } from "@renderer/api/users.api";
import LoginSettingsPopup from "@renderer/components/LoginSettingsPopup";
import { useUpdater } from "@renderer/components/UpdaterContext";
import { usersKeys } from "@renderer/hooks/users/keys";
import { applyVirtualKeyboardButton } from "@renderer/lib/vietnameseTelex";
import { JwtPayload } from "@shared/types";
import { useQueryClient } from "@tanstack/react-query";
import { InfoCircleOutlined } from "@ant-design/icons";
import { Button, Card, Form, Image, Input } from "antd";
import { jwtDecode } from "jwt-decode";
import { ChevronDown, LockKeyhole, User2 } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
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
  const inlineKeyboardRef = useRef<{
    setInput: (input: string, inputName?: string) => void;
  } | null>(null);
  const drawerKeyboardRef = useRef<{
    setInput: (input: string, inputName?: string) => void;
  } | null>(null);
  const [activeField, setActiveField] = useState<keyof LoginForm>("username");
  const [layoutName, setLayoutName] = useState<"default" | "shift">("default");
  const [isKeyboardDrawerOpen, setIsKeyboardDrawerOpen] = useState(false);
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
    inlineKeyboardRef.current?.setInput(value, field);
    drawerKeyboardRef.current?.setInput(value, field);
    form.validateFields([field]).catch(() => undefined);
  };

  const handleInputChange = (field: keyof LoginForm) => (e: ChangeEvent<HTMLInputElement>) => {
    updateFieldValue(field, e.target.value);
  };

  const handleKeyboardKeyPress = (button: string) => {
    if (button === "{shift}" || button === "{lock}") {
      setLayoutName((current) => (current === "default" ? "shift" : "default"));
      return;
    }

    if (button === "{tab}") {
      setActiveField((current) => (current === "username" ? "password" : "username"));
      return;
    }

    if (button === "{enter}") {
      form.submit();
      return;
    }

    const currentValue = keyboardInputs[activeField] ?? "";
    updateFieldValue(activeField, applyVirtualKeyboardButton(currentValue, button));
  };

  const openKeyboardDrawer = (field: keyof LoginForm) => {
    setActiveField(field);
    setIsKeyboardDrawerOpen(true);
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
        setIsKeyboardDrawerOpen(false);
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
      <div className={`login-keyboard-backdrop ${isKeyboardDrawerOpen ? "is-open" : ""}`} />
      <Card
        className={`login-card relative z-10 w-full max-w-6xl overflow-hidden border-0 shadow-2xl shadow-slate-950/30 ${
          isKeyboardDrawerOpen ? "is-password-focused" : ""
        }`}
      >
        <div className="grid gap-0 xl:grid-cols-[420px_minmax(0,1fr)]">
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

            <div className="login-focus-list mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <button
                type="button"
                onClick={() => openKeyboardDrawer("username")}
                className={`login-focus-chip ${activeField === "username" ? "is-active" : ""}`}
              >
                <span className="login-focus-chip__icon">{fieldMeta.username.icon}</span>
                <span>
                  <strong className="block text-sm font-semibold">
                    {fieldMeta.username.label}
                  </strong>
                  <span className="block text-xs text-white/70">Chạm để nhập tên đăng nhập</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => openKeyboardDrawer("password")}
                className={`login-focus-chip ${activeField === "password" ? "is-active" : ""}`}
              >
                <span className="login-focus-chip__icon">{fieldMeta.password.icon}</span>
                <span>
                  <strong className="block text-sm font-semibold">
                    {fieldMeta.password.label}
                  </strong>
                  <span className="block text-xs text-white/70">Chạm để nhập mật khẩu</span>
                </span>
              </button>
            </div>
          </div>

          <div className="p-0 pt-4 xl:p-7 xl:pr-1">
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
                  onFocus={() => openKeyboardDrawer("username")}
                  onChange={handleInputChange("username")}
                  className={activeField === "username" ? "login-input-active" : ""}
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
                  onFocus={() => openKeyboardDrawer("password")}
                  onChange={handleInputChange("password")}
                  className={activeField === "password" ? "login-input-active" : ""}
                />
              </Form.Item>

              <div className="login-keyboard-shell login-keyboard-inline">
                <Keyboard
                  keyboardRef={(instance) => {
                    inlineKeyboardRef.current = instance;
                  }}
                  theme="hg-theme-default login-keyboard-theme"
                  layoutName={layoutName}
                  inputName={activeField}
                  onKeyPress={handleKeyboardKeyPress}
                  layout={{
                    default: [
                      "` 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
                      "{tab} q w e r t y u i o p [ ] \\",
                      "{lock} a s d f g h j k l ; '",
                      "{shift} z x c v b n m , . / {shift}",
                      ".com @ {space} {enter}"
                    ],
                    shift: [
                      "~ ! @ # $ % ^ & * ( ) _ + {bksp}",
                      "{tab} Q W E R T Y U I O P { } |",
                      '{lock} A S D F G H J K L : "',
                      "{shift} Z X C V B N M < > ? {shift}",
                      ".com @ {space} {enter}"
                    ]
                  }}
                />
              </div>

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
      <div
        className={`login-keyboard-shell login-keyboard-drawer ${isKeyboardDrawerOpen ? "is-drawer-open" : ""}`}
      >
        <div className="login-keyboard-drawer-header">
          <div>
            <p className="login-keyboard-drawer-label">Bàn phím ảo</p>
            <p className="login-keyboard-drawer-field">{fieldMeta[activeField].label}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsKeyboardDrawerOpen(false)}
            className="login-keyboard-drawer-close"
          >
            <ChevronDown size={18} />
          </button>
        </div>
        <Keyboard
          keyboardRef={(instance) => {
            drawerKeyboardRef.current = instance;
          }}
          theme="hg-theme-default login-keyboard-theme"
          layoutName={layoutName}
          inputName={activeField}
          onKeyPress={handleKeyboardKeyPress}
          layout={{
            default: [
              "` 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
              "{tab} q w e r t y u i o p [ ] \\",
              "{lock} a s d f g h j k l ; '",
              "{shift} z x c v b n m , . / {shift}",
              ".com @ {space} {enter}"
            ],
            shift: [
              "~ ! @ # $ % ^ & * ( ) _ + {bksp}",
              "{tab} Q W E R T Y U I O P { } |",
              '{lock} A S D F G H J K L : "',
              "{shift} Z X C V B N M < > ? {shift}",
              ".com @ {space} {enter}"
            ]
          }}
        />
      </div>
    </div>
  );
}
