import {
  DisconnectOutlined,
  LinkOutlined,
  LockOutlined,
  PrinterOutlined,
  SettingOutlined
} from "@ant-design/icons";
import { initApi } from "@renderer/api/client";
import { initSocket } from "@renderer/socket/socket";
import { usePrinterStore } from "@renderer/store/printer.store";
import { AppConfig } from "@shared/types";
import type { InputRef } from "antd";
import { Alert, Button, Form, Input, Modal, Select, Tabs, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

type PrinterFormValues = {
  printerName?: string;
};

type EndpointUnlockFormValues = {
  endpointAccessCode?: string;
};

type EndpointFormValues = {
  apiBaseUrl?: string;
};

const ENDPOINT_ACCESS_CODE = "admin123";

const { Paragraph, Text, Title } = Typography;

const toSocketUrl = (apiUrl: string) => {
  if (apiUrl.startsWith("https")) {
    return apiUrl.replace("https", "wss");
  }

  return apiUrl.replace("http", "ws");
};

const LoginSettingsPopup = () => {
  const { message } = useAntdApp();

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("printer");
  const [savingPrinter, setSavingPrinter] = useState(false);
  const [savingEndpoint, setSavingEndpoint] = useState(false);
  const [endpointUnlocked, setEndpointUnlocked] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [printerForm] = Form.useForm<PrinterFormValues>();
  const [endpointUnlockForm] = Form.useForm<EndpointUnlockFormValues>();
  const [endpointForm] = Form.useForm<EndpointFormValues>();
  const endpointInputRef = useRef<InputRef | null>(null);

  const { printers, setSelectedPrinter, fetchPrinters, loading } = usePrinterStore();
  const endpointValue = Form.useWatch("apiBaseUrl", endpointForm);
  const nextSocketUrl = useMemo(
    () =>
      endpointValue
        ? `${toSocketUrl(endpointValue)}/socket`
        : config?.socketUrl
          ? `${config.socketUrl}/socket`
          : "-",
    [endpointValue, config?.socketUrl]
  );

  useEffect(() => {
    if (!open) return;

    const hydrate = async () => {
      const [, currentConfig] = await Promise.all([fetchPrinters(), window.api.getConfig()]);
      const currentPrinter = usePrinterStore.getState().selectedPrinter;

      setConfig(currentConfig);
      printerForm.setFieldsValue({
        printerName: currentPrinter
      });
      endpointUnlockForm.resetFields();
      endpointForm.setFieldsValue({
        apiBaseUrl: currentConfig.apiBaseUrl || ""
      });
    };

    hydrate();
  }, [open, fetchPrinters, printerForm, endpointUnlockForm, endpointForm]);

  useEffect(() => {
    if (!open) return;

    endpointForm.setFieldsValue({
      apiBaseUrl: config?.apiBaseUrl || ""
    });
  }, [open, config?.apiBaseUrl, endpointForm]);

  useEffect(() => {
    if (!open || !endpointUnlocked) return;

    const timer = window.setTimeout(() => {
      endpointInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open, endpointUnlocked, config?.apiBaseUrl, endpointForm]);

  const closeModal = () => {
    setOpen(false);
    setActiveTab("printer");
    setEndpointUnlocked(false);
    printerForm.resetFields();
    endpointUnlockForm.resetFields();
    endpointForm.resetFields();
  };

  const handleSavePrinter = async (values: PrinterFormValues) => {
    setSavingPrinter(true);

    try {
      setSelectedPrinter(values.printerName || "");
      message.success("Lưu cấu hình máy in thành công");
    } finally {
      setSavingPrinter(false);
    }
  };

  const handleUnlockEndpoint = async (values: EndpointUnlockFormValues) => {
    if (values.endpointAccessCode !== ENDPOINT_ACCESS_CODE) {
      endpointUnlockForm.setFields([
        {
          name: "endpointAccessCode",
          errors: ["Mã khóa không đúng"]
        }
      ]);
      return;
    }

    setEndpointUnlocked(true);
    message.success("Mở khóa cấu hình endpoint thành công");
  };

  const handleSaveEndpoint = async (values: EndpointFormValues) => {
    setSavingEndpoint(true);

    try {
      const nextConfig: AppConfig = {
        apiBaseUrl: values.apiBaseUrl!,
        socketUrl: toSocketUrl(values.apiBaseUrl!),
        theme: config?.theme || "light"
      };

      await window.api.setConfig(nextConfig);
      await initApi(nextConfig.apiBaseUrl);
      initSocket(nextConfig.socketUrl);
      setConfig(nextConfig);
      endpointForm.setFieldsValue({ apiBaseUrl: nextConfig.apiBaseUrl });
      message.success("Lưu endpoint thành công");
    } finally {
      setSavingEndpoint(false);
    }
  };

  return (
    <>
      <Button icon={<SettingOutlined />} onClick={() => setOpen(true)} />
      <Modal title="Cài đặt" open={open} centered width={720} onCancel={closeModal} footer={null}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "printer",
              label: "Máy in",
              forceRender: true,
              children: (
                <Form<PrinterFormValues>
                  form={printerForm}
                  layout="vertical"
                  autoComplete="off"
                  onFinish={handleSavePrinter}
                >
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-app-border dark:bg-app-bg/70">
                    <div className="mb-5 flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                        <PrinterOutlined />
                      </div>
                      <div>
                        <Title level={5} className="mb-0!">
                          Máy in mặc định
                        </Title>
                        <Paragraph type="secondary" className="mb-0! mt-1">
                          Chọn máy in mặc định để thuận tiện cho thao tác in vé.
                        </Paragraph>
                      </div>
                    </div>

                    <Form.Item<PrinterFormValues>
                      label="Danh sách máy in"
                      name="printerName"
                      className="mb-3!"
                      rules={[{ required: true, message: "Chọn máy in mặc định" }]}
                    >
                      <Select
                        showSearch
                        loading={loading}
                        options={printers.map((printer) => ({
                          label: printer.displayName || printer.name,
                          value: printer.name
                        }))}
                        placeholder="Chọn máy in mặc định"
                      />
                    </Form.Item>

                    <Form.Item label={null} className="mb-0! flex justify-end">
                      <Button type="primary" htmlType="submit" loading={savingPrinter}>
                        Lưu máy in
                      </Button>
                    </Form.Item>
                  </div>
                </Form>
              )
            },
            {
              key: "endpoint",
              label: "Endpoint",
              forceRender: true,
              children: (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-app-border dark:bg-app-bg/70">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200">
                      <LinkOutlined />
                    </div>
                    <div>
                      <Title level={5} className="mb-0!">
                        Cấu hình endpoint
                      </Title>
                      <Paragraph type="secondary" className="mb-0! mt-1">
                        Dùng khi cấu hình endpoint hiện tại bị sai và bạn cần chỉnh lại ngay từ màn
                        hình đăng nhập.
                      </Paragraph>
                    </div>
                  </div>

                  <div className={endpointUnlocked ? "hidden" : "block"}>
                    <Form<EndpointUnlockFormValues>
                      form={endpointUnlockForm}
                      layout="vertical"
                      autoComplete="off"
                      onFinish={handleUnlockEndpoint}
                    >
                      <div className="space-y-4">
                        <Alert
                          type="warning"
                          showIcon
                          title="Khu vực này bị khóa. Nhập mã khóa quản trị để mở cấu hình endpoint."
                        />

                        <Form.Item<EndpointUnlockFormValues>
                          label="Mã khóa"
                          name="endpointAccessCode"
                          rules={[{ required: true, message: "Nhập mã khóa để mở cấu hình" }]}
                        >
                          <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Nhập mã khóa quản trị"
                          />
                        </Form.Item>

                        <Form.Item label={null} className="mb-0! flex justify-end">
                          <Button type="primary" htmlType="submit">
                            Mở khóa cấu hình
                          </Button>
                        </Form.Item>
                      </div>
                    </Form>
                  </div>

                  <div className={endpointUnlocked ? "block" : "hidden"}>
                    <Form<EndpointFormValues>
                      form={endpointForm}
                      layout="vertical"
                      autoComplete="off"
                      onFinish={handleSaveEndpoint}
                    >
                      <div className="space-y-4">
                        <Alert
                          type="info"
                          showIcon
                          title="Sau khi lưu endpoint, màn hình đăng nhập sẽ dùng ngay cấu hình mới."
                        />

                        <Form.Item<EndpointFormValues>
                          label="API Base URL"
                          name="apiBaseUrl"
                          rules={[{ required: true, message: "Nhập endpoint" }]}
                        >
                          <Input
                            ref={endpointInputRef}
                            placeholder="https://testapiv3.chieuphimquocgia.com.vn"
                          />
                        </Form.Item>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-app-border dark:bg-app-bg/70">
                          <Text
                            type="secondary"
                            className="mb-2 block text-xs uppercase tracking-[0.16em]"
                          >
                            Socket URL
                          </Text>
                          <div className="flex items-start gap-2">
                            <DisconnectOutlined className="mt-1 text-slate-400 dark:text-slate-500" />
                            <p className="mb-0 break-all text-sm font-medium text-slate-700 dark:text-slate-200">
                              {nextSocketUrl}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button type="primary" htmlType="submit" loading={savingEndpoint}>
                            Lưu endpoint
                          </Button>
                        </div>
                      </div>
                    </Form>
                  </div>
                </div>
              )
            }
          ]}
        />
      </Modal>
    </>
  );
};

export default LoginSettingsPopup;
