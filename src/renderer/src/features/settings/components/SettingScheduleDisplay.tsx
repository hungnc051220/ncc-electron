import {
  CopyOutlined,
  DesktopOutlined,
  LinkOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  WifiOutlined
} from "@ant-design/icons";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { usePermission } from "@renderer/permissions/usePermission";
import type { ScheduleDisplayConfigStatus } from "@shared/types";
import { Alert, Avatar, Button, Card, Form, Input, Skeleton, Tag, Typography } from "antd";
import type { FormProps } from "antd";
import { useCallback, useEffect, useState } from "react";

type FieldType = {
  secret: string;
};

const { Paragraph, Text, Title } = Typography;

const SettingScheduleDisplay = () => {
  const { message } = useAntdApp();
  const { can } = usePermission();
  const canConfigure = can("settings_endpoint", "configure");
  const [form] = Form.useForm<FieldType>();
  const [status, setStatus] = useState<ScheduleDisplayConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const candidateSecret = Form.useWatch("secret", form);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await window.api.getScheduleDisplayStatus());
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Không thể đọc trạng thái màn hình TV"
      );
    } finally {
      setLoading(false);
    }
  }, [message]);

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await window.api.getScheduleDisplayStatus());
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Không thể đọc trạng thái màn hình TV"
      );
    }
  }, [message]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const testConnection = async (secret?: string) => {
    setTesting(true);
    try {
      const result = await window.api.testScheduleDisplayConnection(secret?.trim() || undefined);
      if (result.success) {
        message.success(result.message);
      } else {
        message.error(result.message);
      }
      await refreshStatus();
      return result.success;
    } finally {
      setTesting(false);
    }
  };

  const onFinish: FormProps<FieldType>["onFinish"] = async ({ secret }) => {
    setSaving(true);
    try {
      const isValid = await testConnection(secret);
      if (!isValid) return;

      const nextStatus = await window.api.setScheduleDisplayApiKey(secret);
      setStatus(nextStatus);
      form.resetFields();
      message.success("Đã lưu khóa API cho màn hình TV");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thể lưu khóa API");
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      message.success("Đã sao chép đường dẫn màn hình TV");
    } catch {
      message.error("Không thể sao chép tự động, vui lòng sao chép đường dẫn thủ công");
    }
  };

  const serverIsRunning = status?.server.running === true;
  const [recommendedUrl, ...otherUrls] = status?.urls ?? [];

  return (
    <div className="space-y-5 py-1">
      <div>
        <Title level={3} className="mb-1!">
          Cấu hình màn hình TV
        </Title>
        <Paragraph type="secondary" className="mb-0!">
          Phát lịch chiếu hôm nay qua mạng LAN để Android box mở trực tiếp trên TV.
        </Paragraph>
      </div>

      {loading ? (
        <Card>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] 2xl:items-stretch">
          <Card className="h-full">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <Avatar
                  size={56}
                  icon={<DesktopOutlined />}
                  className="shrink-0 bg-sky-50! text-sky-600! dark:bg-sky-950/50! dark:text-sky-200!"
                />
                <div className="min-w-0">
                  <Title level={4} className="mb-1!">
                    Trạng thái phát lịch chiếu
                  </Title>
                  <Text type="secondary">
                    Máy POS phục vụ trang lịch chiếu tại cổng {status?.server.port ?? 17890}.
                  </Text>
                </div>
              </div>

              <Button icon={<ReloadOutlined />} onClick={() => void loadStatus()} loading={loading}>
                Làm mới
              </Button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <Tag color={serverIsRunning ? "success" : "error"}>
                {serverIsRunning ? "Đang hoạt động" : "Chưa hoạt động"}
              </Tag>
              <Tag color={status?.configured ? "processing" : "warning"}>
                {status?.configured ? "Đã cấu hình khóa API" : "Chưa cấu hình khóa API"}
              </Tag>
            </div>

            {status?.server.error ? (
              <Alert className="mb-4" type="error" showIcon title={status.server.error} />
            ) : null}

            {recommendedUrl ? (
              <div className="space-y-3">
                <Text type="secondary" className="block text-xs uppercase tracking-[0.16em]">
                  Địa chỉ đề xuất
                </Text>
                <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/60 dark:bg-sky-950/30">
                  <LinkOutlined className="shrink-0 text-sky-600 dark:text-sky-300" />
                  <p className="mb-0 min-w-0 flex-1 break-all text-base font-semibold text-slate-800 dark:text-slate-100">
                    {recommendedUrl}
                  </p>
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    aria-label={`Sao chép ${recommendedUrl}`}
                    onClick={() => void copyUrl(recommendedUrl)}
                  />
                </div>

                {otherUrls.length ? (
                  <div className="pt-2">
                    <Text
                      type="secondary"
                      className="mb-2 block text-xs uppercase tracking-[0.16em]"
                    >
                      Địa chỉ khác
                    </Text>
                    <div className="space-y-2">
                      {otherUrls.map((url) => (
                        <div
                          key={url}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-app-border dark:bg-app-bg/70"
                        >
                          <p className="mb-0 min-w-0 flex-1 break-all text-sm font-medium text-slate-700 dark:text-slate-200">
                            {url}
                          </p>
                          <Button
                            type="text"
                            icon={<CopyOutlined />}
                            aria-label={`Sao chép ${url}`}
                            onClick={() => void copyUrl(url)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <Alert
                type="warning"
                showIcon
                title="Không tìm thấy địa chỉ IPv4 trong mạng LAN. Hãy kiểm tra kết nối mạng của máy POS."
              />
            )}
          </Card>

          <Card className="h-full">
            <div className="mb-4 flex items-start gap-3">
              <Avatar
                size={44}
                icon={<SafetyCertificateOutlined />}
                className="shrink-0 bg-emerald-50! text-emerald-600! dark:bg-emerald-950/50! dark:text-emerald-200!"
              />
              <div>
                <Title level={4} className="mb-1!">
                  Khóa truy cập API
                </Title>
                <Text type="secondary">
                  Khóa được mã hóa và chỉ dùng trong tiến trình chính của ứng dụng POS.
                </Text>
              </div>
            </div>

            <Alert
              className="mb-4"
              type="info"
              showIcon
              title="Nhập khóa mới để cấu hình lần đầu hoặc thay thế khóa đang lưu."
            />

            <Form<FieldType>
              form={form}
              name="setting-schedule-display"
              layout="vertical"
              autoComplete="off"
              onFinish={onFinish}
            >
              <Form.Item<FieldType>
                label="Secret key"
                name="secret"
                rules={[{ required: true, whitespace: true, message: "Nhập khóa API" }]}
              >
                <Input.Password
                  placeholder={status?.configured ? "Nhập khóa mới để thay thế" : "Nhập khóa API"}
                  disabled={!canConfigure}
                />
              </Form.Item>

              <div className="rounded-2xl border border-sky-200 bg-linear-to-br from-sky-50 to-cyan-50 p-4 dark:border-sky-900/60 dark:from-sky-950/40 dark:to-cyan-950/20">
                <div className="flex items-start gap-3">
                  <WifiOutlined className="mt-1 text-sky-700 dark:text-sky-200" />
                  <Text className="text-sm leading-6 text-sky-800 dark:text-sky-200">
                    Android box và máy POS phải cùng mạng LAN. Nếu không mở được đường dẫn, hãy cho
                    phép TCP cổng {status?.server.port ?? 17890} trong Windows Firewall.
                  </Text>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  onClick={() => void testConnection(candidateSecret)}
                  loading={testing && !saving}
                  disabled={!canConfigure || (!status?.configured && !candidateSecret)}
                >
                  Kiểm tra kết nối
                </Button>
                <Button type="primary" htmlType="submit" loading={saving} disabled={!canConfigure}>
                  Lưu khóa API
                </Button>
              </div>
            </Form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SettingScheduleDisplay;
