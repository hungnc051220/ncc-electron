import { EnvironmentOutlined, InfoCircleOutlined, ShopOutlined } from "@ant-design/icons";
import { usePermission } from "@renderer/permissions/usePermission";
import {
  DEFAULT_BRANCH_SETTINGS,
  useSettingBranchStore
} from "@renderer/store/settingBranch.store";
import type { FormProps } from "antd";
import { Alert, Avatar, Button, Card, Col, Form, Input, Row, Typography, message } from "antd";

type FieldType = {
  cinemaName: string;
  address: string;
};

const { Paragraph, Text, Title } = Typography;

const SettingBranch = () => {
  const { cinemaName, address, setBranch } = useSettingBranchStore();
  const { can } = usePermission();
  const canUpdate = can("settings_branch", "update");

  const onFinish: FormProps<FieldType>["onFinish"] = (values) => {
    setBranch(values.cinemaName.trim(), values.address.trim());
    message.success("Cấu hình chi nhánh thành công");
  };

  return (
    <div className="space-y-5 py-1">
      <div>
        <Title level={3} className="mb-1!">
          Cài đặt chi nhánh
        </Title>
        <Paragraph type="secondary" className="mb-0!">
          Thiết lập tên rạp và địa chỉ hiển thị dùng cho các luồng in vé và thông tin nhận diện chi
          nhánh.
        </Paragraph>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:items-stretch">
        <Card className="h-full">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar
                size={56}
                icon={<ShopOutlined />}
                className="shrink-0 bg-slate-100! text-slate-600! dark:bg-slate-800! dark:text-slate-200!"
              />
              <div className="min-w-0">
                <Title level={4} className="mb-1!">
                  Thông tin chi nhánh hiện tại
                </Title>
                <Text type="secondary">
                  Dữ liệu này sẽ được dùng làm mặc định khi in vé nếu chưa có cấu hình riêng khác.
                </Text>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-app-border dark:bg-app-bg/70">
              <Text type="secondary" className="mb-2 block text-xs uppercase tracking-[0.16em]">
                Tên chi nhánh
              </Text>
              <p className="mb-0 wrap-break-word text-base font-semibold text-slate-800 dark:text-slate-100">
                {cinemaName || DEFAULT_BRANCH_SETTINGS.cinemaName}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-app-border dark:bg-app-bg/70">
              <Text type="secondary" className="mb-2 block text-xs uppercase tracking-[0.16em]">
                Địa chỉ hiển thị
              </Text>
              <p className="mb-0 wrap-break-word text-base font-semibold text-slate-800 dark:text-slate-100">
                {address || DEFAULT_BRANCH_SETTINGS.address}
              </p>
            </div>
          </div>
        </Card>

        <Card className="h-full">
          <div className="mb-4 flex items-start gap-3">
            <Avatar
              size={44}
              icon={<EnvironmentOutlined />}
              className="shrink-0 bg-amber-50! text-amber-600! dark:bg-amber-950/50! dark:text-amber-200!"
            />
            <div>
              <Title level={4} className="mb-1!">
                Cập nhật thông tin chi nhánh
              </Title>
              <Text type="secondary">
                Nên dùng đúng tên rạp và địa chỉ vận hành để đồng bộ trên vé in và chứng từ nội bộ.
              </Text>
            </div>
          </div>

          <Alert
            className="mb-4"
            type="info"
            showIcon
            title="Nếu chưa cấu hình, hệ thống sẽ dùng thông tin mặc định của Trung tâm Chiếu phim Quốc gia."
          />

          <Form<FieldType>
            name="setting-branch"
            initialValues={{
              cinemaName: cinemaName || DEFAULT_BRANCH_SETTINGS.cinemaName,
              address: address || DEFAULT_BRANCH_SETTINGS.address
            }}
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
          >
            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item<FieldType>
                  label="Tên chi nhánh"
                  name="cinemaName"
                  rules={[{ required: true, message: "Nhập tên chi nhánh" }]}
                >
                  <Input placeholder="Ví dụ: TRUNG TÂM CHIẾU PHIM QUỐC GIA" disabled={!canUpdate} />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item<FieldType>
                  label="Địa chỉ"
                  name="address"
                  rules={[{ required: true, message: "Nhập địa chỉ chi nhánh" }]}
                >
                  <Input.TextArea
                    placeholder="Ví dụ: Số 87 Láng Hạ, Ô Chợ Dừa, Hà Nội"
                    autoSize={{ minRows: 3, maxRows: 5 }}
                    disabled={!canUpdate}
                  />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <div className="rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50 to-orange-50 p-4 dark:border-amber-900/60 dark:from-amber-950/40 dark:to-orange-950/20">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200">
                      <InfoCircleOutlined />
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 text-sm font-semibold text-amber-900 dark:text-amber-100">
                        Gợi ý cấu hình
                      </p>
                      <Text className="block text-sm leading-6 text-amber-800 dark:text-amber-200">
                        Tên chi nhánh nên là tên chính thức in trên vé. Địa chỉ nên là bản rút gọn
                        dễ đọc nhưng vẫn đủ để nhận diện địa điểm.
                      </Text>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>

            <Form.Item label={null} className="mb-0! mt-4 flex justify-end">
              <Button type="primary" htmlType="submit" disabled={!canUpdate}>
                Lưu cấu hình chi nhánh
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default SettingBranch;
