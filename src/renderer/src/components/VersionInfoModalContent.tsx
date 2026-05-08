import { Button, Collapse, theme as antdTheme } from "antd";
import {
  CheckCircleFilled,
  CloudSyncOutlined,
  CloudDownloadOutlined,
  MailOutlined,
  WarningFilled
} from "@ant-design/icons";
import logoText from "@renderer/assets/images/logo-text.png";
import { useThemeStore } from "@renderer/store/theme.store";
import { UpdateMode } from "@shared/types";

type VersionInfoModalContentProps = {
  currentVersion: string;
  latestVersion?: string | null;
  updateMode?: UpdateMode;
  messages?: string[];
  isChecking?: boolean;
  isDownloading?: boolean;
  onClose: () => void;
  onQuitApp?: () => void;
  onUpdateNow: () => void;
};

const VersionInfoModalContent = ({
  currentVersion,
  latestVersion,
  updateMode = "optional",
  messages = [],
  isChecking = false,
  isDownloading = false,
  onClose,
  onQuitApp,
  onUpdateNow
}: VersionInfoModalContentProps) => {
  const { theme } = useThemeStore();
  const { token } = antdTheme.useToken();
  const hasUpdate = Boolean(latestVersion && latestVersion !== currentVersion);
  const isForceUpdate = updateMode === "force";
  const isSilentUpdate = updateMode === "silent";
  const statusTitle = isForceUpdate
    ? "Cần cập nhật ứng dụng"
    : hasUpdate
      ? "Đã tìm thấy phiên bản mới"
      : "Bạn đang dùng phiên bản mới nhất";
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
  const warningPanelStyle = {
    borderColor: isDark ? `${token.colorWarning}55` : token.colorWarningBorder,
    background: isDark ? `${token.colorWarning}16` : token.colorWarningBg
  };
  const messageCollapseItems = messages.length
    ? [
        {
          key: "messages",
          label: (
            <span className="text-[13px] font-semibold">Nội dung cập nhật ({messages.length})</span>
          ),
          children: (
            <ul
              className="list-disc space-y-1 pl-4 text-[13px] leading-5"
              style={{ color: token.colorText }}
            >
              {messages.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ),
          styles: {
            header: {
              color: token.colorText,
              padding: "10px 16px"
            },
            body: {
              padding: "10px 16px 12px"
            }
          }
        }
      ]
    : [];

  return (
    <div className="max-h-[calc(100vh-48px)] overflow-hidden rounded-[20px]">
      <div
        className="relative flex max-h-[calc(100vh-48px)] flex-col overflow-hidden rounded-[20px]"
        style={shellStyle}
      >
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
        <div
          className="relative shrink-0 overflow-hidden px-5 py-4 sm:px-6 sm:py-5"
          style={headerStyle}
        >
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

        <div className="relative flex min-h-0 flex-1 flex-col" style={surfaceStyle}>
          <div className="shrink-0 px-5 pt-4 sm:px-6">
            <div className="rounded-[18px] border px-4 py-3 sm:px-5" style={panelStyle}>
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  style={statusIconStyle}
                >
                  {isForceUpdate ? (
                    <WarningFilled className="text-xl" style={{ color: token.colorWarning }} />
                  ) : hasUpdate ? (
                    <CloudSyncOutlined className="text-xl" />
                  ) : (
                    <CheckCircleFilled className="text-xl" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[18px] leading-6 font-semibold" style={titleStyle}>
                    {statusTitle}
                  </div>
                  <div className="mt-1 text-[14px] leading-5" style={subtitleStyle}>
                    {hasUpdate && isForceUpdate
                      ? "Phiên bản hiện tại không còn được hỗ trợ. Vui lòng cập nhật để tiếp tục sử dụng hệ thống."
                      : hasUpdate && isSilentUpdate
                        ? "Bản cập nhật sẽ được tải nền và sẵn sàng cài đặt khi bạn khởi động lại ứng dụng."
                        : hasUpdate
                          ? "Bản cập nhật mới đã được phát hiện. Hãy cập nhật ngay để trải nghiệm những tính năng mới và cải thiện hiệu suất!"
                          : currentVersion
                            ? "Hiện không có bản cập nhật mới nào."
                            : "Đang tải thông tin phiên bản."}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="version-info-scroll min-h-0 flex-1 overflow-y-auto px-5 py-3 sm:px-6">
            <div className="grid content-start gap-3">
              {messages.length > 0 && (
                <Collapse
                  className="version-message-collapse"
                  bordered
                  size="small"
                  items={messageCollapseItems}
                  defaultActiveKey={messages.length <= 3 ? ["messages"] : undefined}
                  style={warningPanelStyle}
                />
              )}

              {hasUpdate && (
                <div className="rounded-[18px] border px-4 py-3 sm:px-5" style={panelStyle}>
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
                      {isForceUpdate ? "Bắt buộc cập nhật" : "Sẵn sàng cập nhật"}
                    </span>
                  </div>
                </div>
              )}

              <div className="rounded-[18px] border px-4 py-3 sm:px-5" style={panelStyle}>
                <div
                  className="text-[13px] font-semibold uppercase tracking-[0.14em]"
                  style={softTextStyle}
                >
                  Liên hệ phát triển
                </div>
                <div className="mt-3 space-y-2">
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
          </div>

          <div
            className="sticky bottom-0 z-10 flex shrink-0 flex-col-reverse gap-3 border-t px-5 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6"
            style={{
              borderColor: isDark ? "rgba(255,255,255,0.08)" : token.colorBorderSecondary,
              background: isDark ? "rgba(9, 18, 34, 0.98)" : "rgba(248,250,252,0.98)"
            }}
          >
            {isForceUpdate ? (
              <Button size="middle" danger className="h-9 rounded-xl px-4" onClick={onQuitApp}>
                Thoát chương trình
              </Button>
            ) : (
              <Button size="middle" className="h-9 rounded-xl px-4" onClick={onClose}>
                Đóng
              </Button>
            )}
            {hasUpdate && (
              <Button
                type="primary"
                size="middle"
                icon={<CloudDownloadOutlined />}
                className="h-9 rounded-xl px-4 text-[14px] font-medium shadow-sm"
                loading={isChecking || isDownloading}
                onClick={onUpdateNow}
              >
                {isDownloading ? "Đang tải cập nhật" : "Cập nhật ngay"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionInfoModalContent;
