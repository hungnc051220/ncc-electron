import { Button, Form, Input, message, Modal } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { AppConfig } from "@shared/types";
import { initApi } from "@renderer/api/client";
import type { FormProps } from "antd";

const SettingEndpointPopup = () => {
  const [open, setOpen] = useState(false);

  const [form] = Form.useForm<AppConfig>();

  useEffect(() => {
    const fetchConfig = async () => {
      const config = await window.api.getConfig();
      form.setFieldValue("apiBaseUrl", config.apiBaseUrl);
    };

    fetchConfig();
  }, [form]);

  const onFinish: FormProps<AppConfig>["onFinish"] = async (values) => {
    await window.api.setConfig(values);
    await initApi();
    message.success("Lưu endpoint thành công");
    setOpen(false);
  };

  return (
    <>
      <Button icon={<SettingOutlined />} onClick={() => setOpen(true)} />
      <Modal
        title="Cài đặt endpoint"
        centered
        open={open}
        width={600}
        onCancel={() => setOpen(false)}
        onOk={form.submit}
      >
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
        </Form>
      </Modal>
    </>
  );
};
export default SettingEndpointPopup;
