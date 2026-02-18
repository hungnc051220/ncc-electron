import { usePrinterStore } from "@renderer/store/printer.store";
import type { FormProps } from "antd";
import { Button, Form, message, Select } from "antd";
import { useEffect } from "react";

type FieldType = {
  printerName: string;
};

const SettingPrinter = () => {
  const { printers, selectedPrinter, setSelectedPrinter, fetchPrinters, loading } =
    usePrinterStore();

  useEffect(() => {
    fetchPrinters();
  }, [fetchPrinters]);

  const onFinish: FormProps<FieldType>["onFinish"] = (values) => {
    setSelectedPrinter(values.printerName);
    message.success("Cấu hình máy in mặc định thành công");
  };

  return (
    <>
      <h3 className="font-semibold text-xl mb-4">Cấu hình máy in mặc định</h3>
      <Form
        name="basic"
        style={{ maxWidth: 600 }}
        initialValues={{ printerName: selectedPrinter }}
        onFinish={onFinish}
        autoComplete="off"
        layout="vertical"
      >
        <Form.Item<FieldType>
          label="Máy in mặc định"
          name="printerName"
          rules={[{ required: true, message: "Chọn máy in mặc định" }]}
        >
          <Select
            loading={loading}
            options={printers.map((p) => ({
              label: p.displayName || p.name,
              value: p.name
            }))}
            placeholder="Chọn máy in mặc định"
          />
        </Form.Item>

        <Form.Item label={null} className="flex justify-end">
          <Button type="primary" htmlType="submit">
            Lưu thông tin
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default SettingPrinter;
