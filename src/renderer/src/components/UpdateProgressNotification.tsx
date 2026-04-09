import { Button, Progress, theme as antdTheme } from "antd";
import {
  CloudDownloadOutlined,
  EyeInvisibleOutlined,
  PauseOutlined,
  CaretRightOutlined
} from "@ant-design/icons";
import type { UpdateDownloadProgress } from "@shared/types";

type UpdateProgressNotificationProps = {
  progress: UpdateDownloadProgress;
  latestVersion?: string | null;
  onHide: () => void;
  isPaused?: boolean;
  onTogglePause?: () => void;
  showMockControls?: boolean;
};

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / 1024 ** exponent;

  return `${amount.toFixed(amount >= 100 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const formatSpeed = (value: number) => `${formatBytes(value)}/s`;

const UpdateProgressNotification = ({
  progress,
  latestVersion,
  onHide,
  isPaused = false,
  onTogglePause,
  showMockControls = false
}: UpdateProgressNotificationProps) => {
  const { token } = antdTheme.useToken();

  return (
    <div
      className="w-115 rounded-[20px] border px-4 py-4 shadow-[0_20px_48px_rgba(15,23,42,0.16)]"
      style={{
        background: token.colorBgElevated,
        borderColor: token.colorBorderSecondary
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-1 items-start gap-3">
          <span
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: token.colorPrimaryBg,
              color: token.colorPrimary
            }}
          >
            <CloudDownloadOutlined className="text-[16px]" />
          </span>
          <div className="min-w-0">
            <div
              className="text-sm font-semibold leading-5"
              style={{ color: token.colorTextHeading }}
            >
              Đang tải bản cập nhật
            </div>
            <div className="text-xs leading-5" style={{ color: token.colorTextSecondary }}>
              {latestVersion
                ? `Phiên bản mới nhất: ${latestVersion}`
                : "Hệ thống đang tải phiên bản mới"}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {showMockControls && onTogglePause && (
            <Button
              type="text"
              size="small"
              icon={isPaused ? <CaretRightOutlined /> : <PauseOutlined />}
              className="h-8 rounded-xl px-2"
              onClick={onTogglePause}
            >
              {isPaused ? "Tiếp tục" : "Tạm dừng"}
            </Button>
          )}
          <Button
            type="text"
            size="small"
            icon={<EyeInvisibleOutlined />}
            className="h-8 rounded-xl px-2"
            onClick={onHide}
          >
            Ẩn xuống
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <Progress
          percent={progress.percent}
          strokeColor={token.colorPrimary}
          railColor={token.colorFillSecondary}
          size={["100%", 10]}
          showInfo
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-2xl px-3 py-2" style={{ background: token.colorFillAlter }}>
          Đã tải:{" "}
          <span className="font-medium" style={{ color: token.colorTextHeading }}>
            {formatBytes(progress.transferred)}
          </span>
        </div>
        <div className="rounded-2xl px-3 py-2" style={{ background: token.colorFillAlter }}>
          Tổng dung lượng:{" "}
          <span className="font-medium" style={{ color: token.colorTextHeading }}>
            {formatBytes(progress.total)}
          </span>
        </div>
        <div className="rounded-2xl px-3 py-2" style={{ background: token.colorFillAlter }}>
          Tốc độ:{" "}
          <span className="font-medium" style={{ color: token.colorTextHeading }}>
            {formatSpeed(progress.bytesPerSecond)}
          </span>
        </div>
        <div className="rounded-2xl px-3 py-2" style={{ background: token.colorFillAlter }}>
          Tiến độ:{" "}
          <span className="font-medium" style={{ color: token.colorTextHeading }}>
            {progress.percent}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default UpdateProgressNotification;
