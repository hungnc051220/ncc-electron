import { SettingOutlined } from "@ant-design/icons";
import { initApi } from "@renderer/api/client";
import { initSocket } from "@renderer/socket/socket";
import { usePrinterStore } from "@renderer/store/printer.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import { useThemeStore } from "@renderer/store/theme.store";
import { AppConfig, AppTheme } from "@shared/types";
import { Button, Form, Input, message, Modal, Radio, Select, Tabs } from "antd";
import type { TabsProps } from "antd";
import { useEffect, useMemo, useState } from "react";

type LoginSettingsForm = AppConfig & {
  posName: string;
  posShortName: string;
  printerName?: string;
};

const DEFAULT_CONFIG: AppConfig = {
  apiBaseUrl: "https://testapiv3.chieuphimquocgia.com.vn",
  socketUrl: "wss://testapiv3.chieuphimquocgia.com.vn",
  theme: "light"
};

const LoginSettingsPopup = () => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<LoginSettingsForm>();

  const { theme, setTheme } = useThemeStore();
  const { posName, posShortName, setPos } = useSettingPosStore();
  const { printers, selectedPrinter, setSelectedPrinter, fetchPrinters, loading } =
    usePrinterStore();

  useEffect(() => {
    if (!open) return;

    const hydrate = async () => {
      const config = (await window.api?.getConfig()) ?? DEFAULT_CONFIG;
      await fetchPrinters();

      form.setFieldsValue({
        apiBaseUrl: config.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl,
        socketUrl: config.socketUrl || DEFAULT_CONFIG.socketUrl,
        theme: config.theme || theme,
        posName: posName || "POS Machine 1",
        posShortName: posShortName || "M11",
        printerName: selectedPrinter
      });
    };

    hydrate();
  }, [open, form, fetchPrinters, posName, posShortName, selectedPrinter, theme]);

  const tabItems = useMemo<TabsProps["items"]>(
    () => [
      {
        key: "appearance",
        label: "Giao diện",
        children: (
          <div className="space-y-4">
            <Form.Item<LoginSettingsForm> label="Chủ đề" name="theme">
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                options={[
                  { label: "Sáng", value: "light" satisfies AppTheme },
                  { label: "Tối", value: "dark" satisfies AppTheme }
                ]}
              />
            </Form.Item>

            <Form.Item<LoginSettingsForm>
              label="API Endpoint"
              name="apiBaseUrl"
              rules={[{ required: true, message: "Nhập API endpoint" }]}
            >
              <Input placeholder="Nhập API endpoint" />
            </Form.Item>

            <Form.Item<LoginSettingsForm>
              label="Socket URL"
              name="socketUrl"
              rules={[{ required: true, message: "Nhập socket URL" }]}
            >
              <Input placeholder="Nhập socket URL" />
            </Form.Item>
          </div>
        )
      },
      {
        key: "pos",
        label: "Máy POS",
        children: (
          <div className="space-y-4">
            <Form.Item<LoginSettingsForm>
              label="Tên máy POS"
              name="posName"
              rules={[{ required: true, message: "Nhập tên máy POS" }]}
            >
              <Input placeholder="Nhập tên máy POS" />
            </Form.Item>

            <Form.Item<LoginSettingsForm>
              label="Mã máy POS"
              name="posShortName"
              rules={[{ required: true, message: "Nhập mã máy POS" }]}
            >
              <Input placeholder="Nhập mã máy POS" />
            </Form.Item>
          </div>
        )
      },
      {
        key: "printer",
        label: "Máy in",
        children: (
          <Form.Item<LoginSettingsForm>
            label="Máy in mặc định"
            name="printerName"
            rules={[{ required: true, message: "Chọn máy in mặc định" }]}
          >
            <Select
              loading={loading}
              options={printers.map((printer) => ({
                label: printer.displayName || printer.name,
                value: printer.name
              }))}
              placeholder="Chọn máy in mặc định"
            />
          </Form.Item>
        )
      }
    ],
    [loading, printers]
  );

  const handleSave = async (values: LoginSettingsForm) => {
    setSaving(true);

    try {
      const { posName, posShortName, printerName, ...configValues } = values;

      await window.api.setConfig(configValues);
      await initApi(configValues.apiBaseUrl);
      initSocket(configValues.socketUrl);

      setTheme(configValues.theme);
      window.api.sendThemeUpdate(configValues.theme);

      setPos(posName, posShortName);
      setSelectedPrinter(printerName || "");

      message.success("Lưu cài đặt thành công");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button icon={<SettingOutlined />} onClick={() => setOpen(true)} />
      <Modal
        title="Cài đặt đăng nhập"
        centered
        open={open}
        width={720}
        onCancel={() => setOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setOpen(false)}>
            Đóng
          </Button>,
          <Button key="save" type="primary" loading={saving} onClick={form.submit}>
            Lưu tất cả
          </Button>
        ]}
      >
        <Form<LoginSettingsForm>
          form={form}
          layout="vertical"
          autoComplete="off"
          onFinish={handleSave}
        >
          <Tabs items={tabItems} />
        </Form>
      </Modal>
    </>
  );
};

export default LoginSettingsPopup;
