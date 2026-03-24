import { Button, Progress, Space, Typography } from "antd";
import { useAutoUpdater } from "@renderer/hooks/useAutoUpdater";

export default function UpdatePanel() {
  const { version, progress, showVersionInfo } = useAutoUpdater();

  return (
    <Space orientation="vertical">
      <Typography.Text>Version: {version}</Typography.Text>

      <Button onClick={showVersionInfo}>Thông tin phiên bản</Button>

      {progress > 0 && <Progress percent={progress} status="active" />}
    </Space>
  );
}
