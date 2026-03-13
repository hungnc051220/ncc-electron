import { initApi } from "@renderer/api/client";
import { usePermission } from "@renderer/permissions/usePermission";
import { AppConfig } from "@shared/types";
import type { FormProps } from "antd";
import { Button, Form, Input, message } from "antd";
import { useEffect } from "react";

const SettingEndpoint = () => {
  const [form] = Form.useForm<AppConfig>();
  const { can } = usePermission();
  const canUpdate = can("settings", "configure");

  useEffect(() => {
    const fetchConfig = async () => {
      const config = await window.api.getConfig();
      form.setFieldValue("apiBaseUrl", config.apiBaseUrl);
    };

    fetchConfig();
  }, [form]);

  const onFinish: FormProps<AppConfig>["onFinish"] = async (values) => {
    await window.api.setConfig(values);
    await initApi(values.apiBaseUrl);
    message.success("Lưu endpoint thành công");
  };

  return (
    <>
      <h3 className="font-semibold text-xl mb-4">Cấu hình Endpoint</h3>
      <Form
        form={form}
        name="basic"
        style={{ maxWidth: 600 }}
        onFinish={onFinish}
        autoComplete="off"
        layout="vertical"
      >
        <Form.Item<AppConfig>
          label="Endpoint"
          name="apiBaseUrl"
          rules={[{ required: true, message: "Nhập endpoint" }]}
        >
          <Input placeholder="Nhập endpoint" />
        </Form.Item>

        <Form.Item label={null} className="flex justify-end">
          <Button type="primary" htmlType="submit" disabled={!canUpdate}>
            Lưu thông tin
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default SettingEndpoint;
