import { Button, theme as antdTheme } from "antd";
import { CloudDownloadOutlined, EyeOutlined } from "@ant-design/icons";

type UpdateProgressDockProps = {
  percent: number;
  latestVersion?: string | null;
  onExpand: () => void;
};

const UpdateProgressDock = ({ percent, latestVersion, onExpand }: UpdateProgressDockProps) => {
  const { token } = antdTheme.useToken();

  return (
    <div
      className="flex min-w-67 items-center gap-3 rounded-[20px] border px-3 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm"
      style={{
        background: token.colorBgElevated,
        borderColor: token.colorBorderSecondary
      }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: token.colorPrimaryBg,
          color: token.colorPrimary
        }}
      >
        <CloudDownloadOutlined className="text-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="truncate text-[13px] font-semibold"
          style={{ color: token.colorTextHeading }}
        >
          Đang tải bản cập nhật
        </div>
        <div className="truncate text-[12px]" style={{ color: token.colorTextSecondary }}>
          {latestVersion ? `Phiên bản ${latestVersion} • ${percent}%` : `Tiến độ tải • ${percent}%`}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          className="h-8 rounded-xl px-2 text-xs"
          onClick={onExpand}
        >
          Mở rộng
        </Button>
      </div>
    </div>
  );
};

export default UpdateProgressDock;
