import {
  ApiOutlined,
  DisconnectOutlined,
  InfoCircleOutlined,
  LinkOutlined
} from "@ant-design/icons";
import { initApi } from "@renderer/api/client";
import { usePermission } from "@renderer/permissions/usePermission";
import { disconnectSocket, initSocket } from "@renderer/socket/socket";
import { useAuthStore } from "@renderer/store/auth.store";
import { AppConfig } from "@shared/types";
import type { FormProps } from "antd";
import { Alert, Avatar, Button, Card, Col, Form, Input, Row, Skeleton, Typography, message } from "antd";
import { useEffect, useState } from "react";

const { Paragraph, Text, Title } = Typography;

const toSocketUrl = (apiUrl: string) => {
  if (apiUrl.startsWith("https")) {
    return apiUrl.replace("https", "wss");
  }

  return apiUrl.replace("http", "ws");
};

const SettingEndpoint = () => {
  const [form] = Form.useForm<AppConfig>();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const logout = useAuthStore((s) => s.logout);
  const { can } = usePermission();
  const canUpdate = can("settings_endpoint", "configure");
  const apiBaseUrl = Form.useWatch("apiBaseUrl", form);
  const nextSocketUrl = apiBaseUrl ? toSocketUrl(apiBaseUrl) : config?.socketUrl || "";

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const currentConfig = await window.api.getConfig();
        setConfig(currentConfig);
        form.setFieldsValue(currentConfig);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfig();
  }, [form]);

  const onFinish: FormProps<AppConfig>["onFinish"] = async (values) => {
    const nextConfig: AppConfig = {
      apiBaseUrl: values.apiBaseUrl,
      socketUrl: toSocketUrl(values.apiBaseUrl),
      theme: config?.theme || "light"
    };

    await window.api.setConfig(nextConfig);
    await initApi(nextConfig.apiBaseUrl);
    initSocket(nextConfig.socketUrl);
    setConfig(nextConfig);
    form.setFieldsValue(nextConfig);
    disconnectSocket();
    message.success("Lưu endpoint thành công. Vui lòng đăng nhập lại để áp dụng cấu hình mới");
    logout();
  };

  return (
    <div className="space-y-5 py-1">
      <div>
        <Title level={3} className="mb-1!">
          Cấu hình Endpoint
        </Title>
        <Paragraph type="secondary" className="mb-0!">
          Thiết lập địa chỉ API và kết nối realtime để ứng dụng giao tiếp đúng môi trường.
        </Paragraph>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:items-stretch">
        <Card className="h-full">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar
                size={56}
                icon={<ApiOutlined />}
                className="shrink-0 bg-slate-100! text-slate-600! dark:bg-slate-800! dark:text-slate-200!"
              />
              <div className="min-w-0">
                <Title level={4} className="mb-1!">
                  Kết nối hệ thống
                </Title>
                <Text type="secondary">
                  Thông tin kết nối hiện tại của API và socket realtime.
                </Text>
              </div>
            </div>
          </div>

          {loadingConfig ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-app-border dark:bg-app-bg/70">
                <Text type="secondary" className="mb-2 block text-xs uppercase tracking-[0.16em]">
                  API Base URL hiện tại
                </Text>
                <div className="flex items-start gap-2">
                  <LinkOutlined className="mt-1 text-slate-400 dark:text-slate-500" />
                  <p className="mb-0 min-w-0 break-all text-base font-semibold text-slate-800 dark:text-slate-100">
                    {config?.apiBaseUrl || "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-app-border dark:bg-app-bg/70">
                <Text type="secondary" className="mb-2 block text-xs uppercase tracking-[0.16em]">
                  Socket URL realtime
                </Text>
                <div className="flex items-start gap-2">
                  <DisconnectOutlined className="mt-1 text-slate-400 dark:text-slate-500" />
                  <p className="mb-0 min-w-0 break-all text-base font-medium text-slate-700 dark:text-slate-200">
                    {config?.socketUrl ? `${config.socketUrl}/socket` : "-"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="h-full">
          <div className="mb-4 flex items-start gap-3">
            <Avatar
              size={44}
              icon={<LinkOutlined />}
              className="shrink-0 bg-sky-50! text-sky-600! dark:bg-sky-950/50! dark:text-sky-200!"
            />
            <div>
              <Title level={4} className="mb-1!">
                Cập nhật endpoint
              </Title>
              <Text type="secondary">
                Khi thay đổi API Base URL, hệ thống sẽ tự chỉnh socket URL tương ứng.
              </Text>
            </div>
          </div>

          <Alert
            className="mb-4"
            type="warning"
            showIcon
            title="Chỉ thay đổi endpoint khi bạn chắc chắn về môi trường kết nối. Thiết lập sai có thể làm ứng dụng không lấy được dữ liệu."
          />

          <Form<AppConfig>
            form={form}
            name="setting-endpoint"
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
          >
            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item<AppConfig>
                  label="API Base URL"
                  name="apiBaseUrl"
                  rules={[{ required: true, message: "Nhập endpoint" }]}
                >
                  <Input placeholder="Ví dụ: https://api.example.com" disabled={!canUpdate} />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-app-border dark:bg-app-bg/70">
                  <Text type="secondary" className="mb-2 block text-xs uppercase tracking-[0.16em]">
                    Socket URL
                  </Text>
                  <p className="mb-0 min-w-0 break-all text-base font-medium text-slate-700 dark:text-slate-200">
                    {nextSocketUrl ? `${nextSocketUrl}/socket` : "-"}
                  </p>
                </div>
              </Col>

              <Col xs={24}>
                <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50 p-4 shadow-sm dark:border-sky-900/60 dark:from-sky-950/40 dark:to-cyan-950/20">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200">
                      <InfoCircleOutlined />
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 text-sm font-semibold text-sky-900 dark:text-sky-100">
                        Gợi ý cấu hình
                      </p>
                      <Text className="block text-sm leading-6 text-sky-800 dark:text-sky-200">
                        Nên dùng URL đầy đủ gồm giao thức `http://` hoặc `https://`. Socket
                        realtime sẽ tự chuyển sang `ws://` hoặc `wss://`.
                      </Text>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>

            <Form.Item label={null} className="mb-0! mt-4 flex justify-end">
              <Button type="primary" htmlType="submit" disabled={!canUpdate || loadingConfig}>
                Lưu endpoint
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default SettingEndpoint;
