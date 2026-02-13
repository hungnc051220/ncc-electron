import { Button, Progress, Space, Typography } from "antd";
import { useAutoUpdater } from "@renderer/hooks/useAutoUpdater";

export default function UpdatePanel() {
  const { version, progress, manualCheck } = useAutoUpdater();

  return (
    <Space orientation="vertical">
      <Typography.Text>Version: {version}</Typography.Text>

      <Button onClick={manualCheck}>Kiểm tra cập nhật</Button>

      {progress > 0 && <Progress percent={progress} status="active" />}
    </Space>
  );
}
