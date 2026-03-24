import { Button, Progress } from "antd";
import { DownloadOutlined, EyeInvisibleOutlined } from "@ant-design/icons";
import type { UpdateDownloadProgress } from "@shared/types";

type UpdateProgressNotificationProps = {
  progress: UpdateDownloadProgress;
  latestVersion?: string | null;
  onHide: () => void;
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
  onHide
}: UpdateProgressNotificationProps) => {
  return (
    <div className="w-[320px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <DownloadOutlined className="text-primary" />
            <span>Đang tải bản cập nhật</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {latestVersion ? `Phiên bản mới nhất: ${latestVersion}` : "Hệ thống đang tải phiên bản mới"}
          </div>
        </div>
        <Button type="text" size="small" icon={<EyeInvisibleOutlined />} onClick={onHide}>
          Ẩn xuống
        </Button>
      </div>

      <div className="mt-3">
        <Progress percent={progress.percent} strokeColor="#464FB4" size={["100%", 8]} showInfo />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div>
          Đã tải: <span className="font-medium text-slate-900">{formatBytes(progress.transferred)}</span>
        </div>
        <div>
          Tổng dung lượng: <span className="font-medium text-slate-900">{formatBytes(progress.total)}</span>
        </div>
        <div>
          Tốc độ: <span className="font-medium text-slate-900">{formatSpeed(progress.bytesPerSecond)}</span>
        </div>
        <div>
          Tiến độ: <span className="font-medium text-slate-900">{progress.percent}%</span>
        </div>
      </div>
    </div>
  );
};

export default UpdateProgressNotification;
