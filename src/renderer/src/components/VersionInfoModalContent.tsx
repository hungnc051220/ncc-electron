import { Button, theme as antdTheme } from "antd";
import {
  CheckCircleFilled,
  CloudSyncOutlined,
  CloudDownloadOutlined,
  MailOutlined
} from "@ant-design/icons";
import logoText from "@renderer/assets/images/logo-text.png";
import { useThemeStore } from "@renderer/store/theme.store";

type VersionInfoModalContentProps = {
  currentVersion: string;
  latestVersion?: string | null;
  isChecking?: boolean;
  isDownloading?: boolean;
  onClose: () => void;
  onUpdateNow: () => void;
};

const VersionInfoModalContent = ({
  currentVersion,
  latestVersion,
  isChecking = false,
  isDownloading = false,
  onClose,
  onUpdateNow
}: VersionInfoModalContentProps) => {
  const { theme } = useThemeStore();
  const { token } = antdTheme.useToken();
  const hasUpdate = Boolean(latestVersion && latestVersion !== currentVersion);
  const isDark = theme === "dark";
  const shellStyle = {
    background: isDark
      ? "linear-gradient(180deg, rgba(8,15,29,0.98), rgba(13,23,42,0.96))"
      : "linear-gradient(180deg, rgba(255,255,255,0.99), rgba(248,250,252,0.98))",
    color: token.colorText
  };
  const surfaceStyle = {
    background: isDark ? "rgba(9, 18, 34, 0.54)" : "rgba(255, 255, 255, 0.82)"
  };
  const titleStyle = { color: token.colorTextHeading };
  const subtitleStyle = { color: token.colorTextDescription };
  const softTextStyle = { color: token.colorTextSecondary };
  const panelStyle = {
    borderColor: isDark ? "rgba(255,255,255,0.08)" : token.colorBorderSecondary,
    background: isDark ? "rgba(255,255,255,0.04)" : token.colorBgElevated,
    boxShadow: isDark
      ? "inset 0 1px 0 rgba(255,255,255,0.03)"
      : "0 18px 40px rgba(15, 23, 42, 0.08)"
  };
  const headerStyle = {
    background: isDark
      ? `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, rgba(26,39,70,0.94) 42%, rgba(8,18,33,0.98) 100%)`
      : `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, rgba(230,238,255,0.96) 38%, rgba(186,214,255,0.86) 100%)`
  };
  const headerPatternStyle = {
    backgroundImage: isDark
      ? "linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.08) 1px, transparent 1px)"
      : "linear-gradient(90deg, rgba(255,255,255,0.34) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
    backgroundSize: "22px 22px",
    maskImage: "linear-gradient(90deg, rgba(0,0,0,0.18), rgba(0,0,0,0.92))",
    WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0.18), rgba(0,0,0,0.92))"
  };
  const headerAccentStyle = {
    background: isDark
      ? `radial-gradient(circle, ${token.colorPrimary}55 0%, transparent 72%)`
      : `radial-gradient(circle, ${token.colorPrimary}33 0%, transparent 72%)`
  };
  const badgeStyle = {
    background: isDark ? `${token.colorPrimary}24` : token.colorPrimaryBg,
    color: token.colorPrimary,
    borderColor: isDark ? `${token.colorPrimary}33` : token.colorPrimaryBorder
  };
  const statusIconStyle = {
    background: isDark ? `${token.colorPrimary}22` : token.colorPrimaryBg,
    color: token.colorPrimary
  };
  const updateChipStyle = {
    background: isDark ? `${token.colorSuccess}1c` : token.colorSuccessBg,
    color: token.colorSuccess
  };

  return (
    <div className="overflow-hidden rounded-[20px]">
      <div className="relative overflow-hidden rounded-[20px]" style={shellStyle}>
        <div
          className="pointer-events-none absolute -top-16 left-2 h-32 w-32 rounded-full blur-3xl"
          style={{
            background: isDark ? `${token.colorPrimary}22` : `${token.colorPrimary}18`
          }}
        />
        <div
          className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full blur-3xl"
          style={{
            background: isDark ? "rgba(125, 211, 252, 0.10)" : "rgba(96, 165, 250, 0.16)"
          }}
        />
        <div className="relative overflow-hidden px-5 py-5 sm:px-6 sm:py-6" style={headerStyle}>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-[72%] opacity-80"
            style={headerPatternStyle}
          />
          <div
            className="pointer-events-none absolute -top-8 right-8 h-32 w-32 rounded-full blur-3xl"
            style={headerAccentStyle}
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <img src={logoText} alt="logo" className="h-10 w-auto object-contain sm:h-11" />
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={badgeStyle}
                >
                  Trung tâm phiên bản
                </span>
              </div>
            </div>
            <div
              className="hidden min-w-34 rounded-[18px] border px-3 py-3 text-right backdrop-blur-sm sm:block"
              style={{
                borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.42)",
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.38)"
              }}
            >
              <div
                className="text-[11px] uppercase tracking-[0.14em]"
                style={{
                  color: isDark ? "rgba(255,255,255,0.62)" : "rgba(15,23,42,0.52)"
                }}
              >
                Phiên bản hiện tại
              </div>
              <div
                className="mt-1 text-[18px] leading-none font-semibold"
                style={{ color: isDark ? token.colorWhite : token.colorTextHeading }}
              >
                {currentVersion || "--"}
              </div>
            </div>
          </div>
        </div>

        <div className="relative px-5 py-5 sm:px-6" style={surfaceStyle}>
          <div className="grid gap-4">
            <div className="rounded-[18px] border px-4 py-4 sm:px-5" style={panelStyle}>
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  style={statusIconStyle}
                >
                  {hasUpdate ? (
                    <CloudSyncOutlined className="text-xl" />
                  ) : (
                    <CheckCircleFilled className="text-xl" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[18px] leading-6 font-semibold" style={titleStyle}>
                    {hasUpdate ? "Đã tìm thấy phiên bản mới" : "Bạn đang dùng phiên bản mới nhất"}
                  </div>
                  <div className="mt-1 text-[14px] leading-5" style={subtitleStyle}>
                    {hasUpdate
                      ? "Bản cập nhật mới đã được phát hiện. Hãy cập nhật ngay để trải nghiệm những tính năng mới và cải thiện hiệu suất!"
                      : currentVersion
                        ? "Hiện không có bản cập nhật mới nào."
                        : "Đang tải thông tin phiên bản."}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {hasUpdate && (
                <div className="rounded-[18px] border px-4 py-4 sm:px-5" style={panelStyle}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div
                        className="text-[12px] font-semibold uppercase tracking-[0.12em]"
                        style={softTextStyle}
                      >
                        Phiên bản mới nhất
                      </div>
                      <div
                        className="mt-1 text-[18px] font-semibold"
                        style={{ color: token.colorPrimary }}
                      >
                        {latestVersion || "--"}
                      </div>
                    </div>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold"
                      style={updateChipStyle}
                    >
                      <CloudDownloadOutlined className="text-[11px]" />
                      Sẵn sàng cập nhật
                    </span>
                  </div>
                </div>
              )}

              <div className="rounded-[18px] border px-4 py-4 sm:px-5" style={panelStyle}>
                <div
                  className="text-[13px] font-semibold uppercase tracking-[0.14em]"
                  style={softTextStyle}
                >
                  Liên hệ phát triển
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="text-[12px] uppercase tracking-[0.12em]" style={softTextStyle}>
                      Tác giả
                    </div>
                    <div className="mt-1">
                      <div className="uppercase version-author-gradient leading-6 font-semibold text-base">
                        Nguyễn Cảnh Hưng
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] uppercase tracking-[0.12em]" style={softTextStyle}>
                      Email
                    </div>
                    <a
                      href="mailto:hungnc.dev@gmail.com"
                      className="mt-1 inline-flex items-center gap-2 text-[14px] font-medium transition-opacity hover:opacity-80"
                      style={{ color: token.colorPrimary }}
                    >
                      <MailOutlined className="text-[13px]" />
                      hungnc.dev@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-end">
              <Button size="middle" className="h-9 rounded-xl px-4" onClick={onClose}>
                Đóng
              </Button>
              {hasUpdate && (
                <Button
                  type="primary"
                  size="middle"
                  icon={<CloudDownloadOutlined />}
                  className="h-9 rounded-xl px-4 text-[14px] font-medium shadow-sm"
                  loading={isChecking || isDownloading}
                  onClick={onUpdateNow}
                >
                  Cập nhật ngay
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionInfoModalContent;
