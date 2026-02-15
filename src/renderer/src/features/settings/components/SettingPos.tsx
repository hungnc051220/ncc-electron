import { useSettingPosStore } from "@renderer/store/settingPos.store";
import type { FormProps } from "antd";
import { Button, Form, Input, message } from "antd";

type FieldType = {
  posName: string;
  posShortName: string;
};

const SettingPos = () => {
  const setPos = useSettingPosStore((s) => s.setPos);

  const onFinish: FormProps<FieldType>["onFinish"] = (values) => {
    setPos(values.posName, values.posShortName);
    message.success("Cấu hình máy POS thành công");
  };

  return (
    <>
      <h3 className="font-semibold text-xl mb-4">Cấu hình máy POS</h3>
      <Form
        name="basic"
        style={{ maxWidth: 600 }}
        initialValues={{ remember: true }}
        onFinish={onFinish}
        autoComplete="off"
        layout="vertical"
      >
        <Form.Item<FieldType>
          label="Tên máy POS"
          name="posName"
          rules={[{ required: true, message: "Nhập tên máy POS" }]}
        >
          <Input placeholder="Nhập tên máy POS" />
        </Form.Item>

        <Form.Item<FieldType>
          label="Mã máy POS"
          name="posShortName"
          rules={[{ required: true, message: "Nhập mã máy POS" }]}
        >
          <Input placeholder="Nhập mã máy POS" />
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

export default SettingPos;
