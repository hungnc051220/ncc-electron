import { DesktopOutlined, IdcardOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { usePermission } from "@renderer/permissions/usePermission";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import type { FormProps } from "antd";
import { Alert, Avatar, Button, Card, Col, Form, Input, Row, Typography } from "antd";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

type FieldType = {
  posName: string;
  posShortName: string;
};

const { Paragraph, Text, Title } = Typography;

const SettingPos = () => {
  const { message } = useAntdApp();

  const { posName, posShortName, setPos } = useSettingPosStore();
  const { can } = usePermission();
  const canUpdate = can("settings_pos", "update");

  const onFinish: FormProps<FieldType>["onFinish"] = (values) => {
    setPos(values.posName, values.posShortName);
    message.success("Cấu hình máy POS thành công");
  };

  return (
    <div className="space-y-5 py-1">
      <div>
        <Title level={3} className="mb-1!">
          Cấu hình máy POS
        </Title>
        <Paragraph type="secondary" className="mb-0!">
          Thiết lập tên hiển thị và mã định danh cho máy POS đang sử dụng tại quầy.
        </Paragraph>
      </div>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] 2xl:items-stretch">
        <Card className="h-full">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar
                size={56}
                icon={<DesktopOutlined />}
                className="shrink-0 bg-slate-100! text-slate-600! dark:bg-slate-800! dark:text-slate-200!"
              />
              <div className="min-w-0">
                <Title level={4} className="mb-1!">
                  Thông tin máy POS
                </Title>
                <Text type="secondary">
                  Dữ liệu này được dùng để nhận diện máy trên giao diện vận hành và một số luồng in
                  vé.
                </Text>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-app-border dark:bg-app-bg/70">
              <Text type="secondary" className="mb-2 block text-xs uppercase tracking-[0.16em]">
                Tên máy hiện tại
              </Text>
              <p className="mb-0 wrap-break-word text-base font-semibold text-slate-800 dark:text-slate-100">
                {posName || "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-app-border dark:bg-app-bg/70">
              <Text type="secondary" className="mb-2 block text-xs uppercase tracking-[0.16em]">
                Mã máy hiện tại
              </Text>
              <p className="mb-0 break-all text-base font-semibold text-slate-800 dark:text-slate-100">
                {posShortName || "-"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="h-full">
          <div className="mb-4 flex items-start gap-3">
            <Avatar
              size={44}
              icon={<IdcardOutlined />}
              className="shrink-0 bg-emerald-50! text-emerald-600! dark:bg-emerald-950/50! dark:text-emerald-200!"
            />
            <div>
              <Title level={4} className="mb-1!">
                Cập nhật cấu hình
              </Title>
              <Text type="secondary">
                Sử dụng tên dễ nhận biết và mã theo cấu hình để đồng bộ thao tác giữa các quầy.
              </Text>
            </div>
          </div>

          <Alert
            className="mb-4"
            type="info"
            showIcon
            title="Tên máy nên rõ nghĩa theo vị trí hoặc quầy bán vé."
          />

          <Form<FieldType>
            name="setting-pos"
            initialValues={{ posName, posShortName }}
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
          >
            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item<FieldType>
                  label="Tên máy POS"
                  name="posName"
                  rules={[{ required: true, message: "Nhập tên máy POS" }]}
                >
                  <Input placeholder="Ví dụ: POS Quầy Vé 01" disabled={!canUpdate} />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item<FieldType>
                  label="Mã máy POS"
                  name="posShortName"
                  rules={[{ required: true, message: "Nhập mã máy POS" }]}
                >
                  <Input placeholder="Ví dụ: QV01" disabled={!canUpdate} />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <div className="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50 p-4 dark:border-emerald-900/60 dark:from-emerald-950/40 dark:to-teal-950/20">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200">
                      <InfoCircleOutlined />
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                        Gợi ý đặt tên
                      </p>
                      <Text className="block text-sm leading-6 text-emerald-800 dark:text-emerald-200">
                        Nên đặt theo vị trí quầy hoặc khu vực vận hành để nhân viên dễ nhận biết khi
                        in vé và đối soát.
                      </Text>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>

            <Form.Item label={null} className="mb-0! mt-4 flex justify-end">
              <Button type="primary" htmlType="submit" disabled={!canUpdate}>
                Lưu cấu hình POS
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default SettingPos;
