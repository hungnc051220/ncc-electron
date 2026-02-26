import { SettingOutlined } from "@ant-design/icons";
import { AppConfig } from "@shared/types";
import type { FormProps } from "antd";
import { Button, Form, Input, message, Modal } from "antd";
import { useEffect, useState } from "react";

const SettingEndpointPopup = () => {
  const [open, setOpen] = useState(false);

  const [form] = Form.useForm<AppConfig>();

  useEffect(() => {
    const fetchConfig = async () => {
      const config = await window.api?.getConfig();
      form.setFieldValue(
        "apiBaseUrl",
        config?.apiBaseUrl || "https://testapiv3.chieuphimquocgia.com.vn"
      );
    };

    fetchConfig();
  }, [form]);

  const onFinish: FormProps<AppConfig>["onFinish"] = async (values) => {
    await window.api.setConfig(values);
    message.success("Lưu endpoint thành công");
    setOpen(false);
    window.location.reload();
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
        modalRender={(dom) => (
          <Form
            form={form}
            name="basic"
            style={{ maxWidth: 600 }}
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
          >
            {dom}
          </Form>
        )}
      >
        <Form.Item<AppConfig>
          label="Endpoint"
          name="apiBaseUrl"
          rules={[{ required: true, message: "Nhập endpoint" }]}
        >
          <Input placeholder="Nhập endpoint" />
        </Form.Item>
      </Modal>
    </>
  );
};
export default SettingEndpointPopup;
