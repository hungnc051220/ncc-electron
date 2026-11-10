import { Button, Space } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

type UpdateErrorNotificationActionsProps = {
  onRetry?: () => void;
  onClose: () => void;
};

const UpdateErrorNotificationActions = ({
  onRetry,
  onClose
}: UpdateErrorNotificationActionsProps) => (
  <Space size={8}>
    <Button size="small" onClick={onClose}>
      Đóng
    </Button>
    {onRetry ? (
      <Button size="small" type="primary" icon={<ReloadOutlined />} onClick={onRetry}>
        Thử lại
      </Button>
    ) : null}
  </Space>
);

export default UpdateErrorNotificationActions;
