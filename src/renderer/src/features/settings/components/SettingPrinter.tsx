import {
  InfoCircleOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined
} from "@ant-design/icons";
import { usePrinterStore } from "@renderer/store/printer.store";
import type { FormProps } from "antd";
import { Alert, Avatar, Button, Card, Form, Select, Typography, message } from "antd";
import { useEffect } from "react";

type FieldType = {
  printerName: string;
};

const { Paragraph, Text, Title } = Typography;

const SettingPrinter = () => {
  const [form] = Form.useForm<FieldType>();
  const { printers, selectedPrinter, setSelectedPrinter, fetchPrinters, loading } =
    usePrinterStore();

  useEffect(() => {
    void fetchPrinters();
  }, [fetchPrinters]);

  useEffect(() => {
    form.setFieldsValue({
      printerName: selectedPrinter
    });
  }, [form, selectedPrinter]);

  const onFinish: FormProps<FieldType>["onFinish"] = (values) => {
    setSelectedPrinter(values.printerName);
    message.success("Cấu hình máy in mặc định thành công");
  };

  const printerOptions = printers.map((printer) => ({
    label: printer.displayName || printer.name,
    value: printer.name
  }));

  const activePrinter = printers.find((printer) => printer.name === selectedPrinter);

  return (
    <div className="space-y-5 py-1">
      <div>
        <Title level={3} className="mb-1!">
          Cấu hình máy in
        </Title>
        <Paragraph type="secondary" className="mb-0!">
          Chọn máy in mặc định để các thao tác in vé và xuất vé diễn ra nhanh, đúng thiết bị.
        </Paragraph>
      </div>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] 2xl:items-stretch">
        <Card className="h-full">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar
                size={56}
                icon={<PrinterOutlined />}
                className="shrink-0 bg-slate-100! text-slate-600! dark:bg-slate-800! dark:text-slate-200!"
              />
              <div className="min-w-0">
                <Title level={4} className="mb-1!">
                  Trạng thái máy in
                </Title>
                <Text type="secondary">
                  Theo dõi máy in đang được chọn mặc định và số lượng thiết bị đang được hệ thống
                  nhận diện.
                </Text>
              </div>
            </div>

            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={() => void fetchPrinters()}
              className="w-full sm:w-auto sm:self-start"
            >
              Tải lại
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-app-border dark:bg-app-bg/70">
              <Text type="secondary" className="mb-2 block text-xs uppercase tracking-[0.16em]">
                Máy in mặc định
              </Text>
              <p className="mb-0 wrap-break-word text-base font-semibold text-slate-800 dark:text-slate-100">
                {activePrinter?.displayName || selectedPrinter || "Chưa cấu hình"}
              </p>
              {activePrinter?.displayName && activePrinter.name !== activePrinter.displayName ? (
                <Text className="mt-2 block text-sm text-slate-500 dark:text-slate-400">
                  Tên hệ thống: {activePrinter.name}
                </Text>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-app-border dark:bg-app-bg/70">
              <Text type="secondary" className="mb-2 block text-xs uppercase tracking-[0.16em]">
                Thiết bị khả dụng
              </Text>
              <p className="mb-0 text-base font-semibold text-slate-800 dark:text-slate-100">
                {loading ? "Đang tải..." : `${printers.length} máy in`}
              </p>
              <Text className="mt-2 block text-sm text-slate-500 dark:text-slate-400">
                Danh sách này được đọc trực tiếp từ máy đang sử dụng.
              </Text>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-app-border dark:bg-app-bg/70">
            <Text type="secondary" className="mb-2 block text-xs uppercase tracking-[0.16em]">
              Gợi ý vận hành
            </Text>
            <div className="space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <p className="mb-0">
                Ưu tiên chọn máy in đúng quầy để tránh nhầm thiết bị khi in vé.
              </p>
              <p className="mb-0">
                Nếu vừa cắm máy in mới hoặc đổi kết nối USB/LAN, hãy dùng nút tải lại để cập nhật
                danh sách.
              </p>
            </div>
          </div>
        </Card>

        <Card className="h-full">
          <div className="mb-4 flex items-start gap-3">
            <Avatar
              size={44}
              icon={<SafetyCertificateOutlined />}
              className="shrink-0 bg-amber-50! text-amber-600! dark:bg-amber-950/50! dark:text-amber-200!"
            />
            <div>
              <Title level={4} className="mb-1!">
                Chọn máy in mặc định
              </Title>
              <Text type="secondary">
                Thiết lập này sẽ được dùng lại ở các màn bán vé, in vé online và các luồng xuất vé
                khác.
              </Text>
            </div>
          </div>

          <Alert
            className="mb-4"
            type={printers.length > 0 ? "info" : "warning"}
            showIcon
            title={
              printers.length > 0
                ? "Chọn đúng máy in nhiệt hoặc máy in vé đang kết nối với quầy hiện tại."
                : "Chưa tìm thấy máy in nào. Hãy kiểm tra kết nối thiết bị rồi tải lại danh sách."
            }
          />

          <Form<FieldType>
            form={form}
            name="setting-printer"
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
          >
            <Form.Item<FieldType>
              label="Danh sách máy in"
              name="printerName"
              rules={[{ required: true, message: "Chọn máy in mặc định" }]}
            >
              <Select
                loading={loading}
                options={printerOptions}
                placeholder="Chọn máy in mặc định"
                showSearch
                optionFilterProp="label"
                notFoundContent={loading ? "Đang tải danh sách máy in..." : "Không có máy in nào"}
              />
            </Form.Item>

            <div className="rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50 to-orange-50 p-4 dark:border-amber-900/60 dark:from-amber-950/40 dark:to-orange-950/20">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200">
                  <InfoCircleOutlined />
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Mẹo cấu hình
                  </p>
                  <Text className="block text-sm leading-6 text-amber-800 dark:text-amber-200">
                    Nên ưu tiên máy in có tên dễ nhận biết theo quầy hoặc vị trí đặt thiết bị để
                    giảm sai sót khi vận hành.
                  </Text>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button onClick={() => void fetchPrinters()} loading={loading}>
                Quét lại máy in
              </Button>
              <Button type="primary" htmlType="submit" disabled={printerOptions.length === 0}>
                Lưu cấu hình máy in
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default SettingPrinter;
