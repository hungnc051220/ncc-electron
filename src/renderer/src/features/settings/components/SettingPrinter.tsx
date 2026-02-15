import { useSettingPosStore } from "@renderer/store/settingPos.store";
import type { FormProps } from "antd";
import { Button, Form, message, Select } from "antd";

type FieldType = {
  posName: string;
  posShortName: string;
};

const SettingPrinter = () => {
  const setPos = useSettingPosStore((s) => s.setPos);

  const onFinish: FormProps<FieldType>["onFinish"] = (values) => {
    setPos(values.posName, values.posShortName);
    message.success("Cấu hình máy POS thành công");
  };

  return (
    <>
      <h3 className="font-semibold text-xl mb-4">Cấu hình máy in</h3>
      <Form
        name="basic"
        style={{ maxWidth: 600 }}
        initialValues={{ remember: true }}
        onFinish={onFinish}
        autoComplete="off"
        layout="vertical"
      >
        <Form.Item<FieldType>
          label="Máy in"
          name="posName"
          rules={[{ required: true, message: "Chọn máy in" }]}
        >
          <Select options={[]} placeholder="Chọn máy in" />
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
