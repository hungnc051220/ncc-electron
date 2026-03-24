import { Button } from "antd";
import { CheckCircleFilled, CloudDownloadOutlined } from "@ant-design/icons";
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
  const hasUpdate = Boolean(latestVersion && latestVersion !== currentVersion);
  const isDark = theme === "dark";
  const shellClassName = isDark
    ? "bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(30,41,59,0.94))] text-slate-50"
    : "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] text-slate-900";
  const surfaceClassName = isDark ? "bg-[rgba(15,23,42,0.42)]" : "bg-[rgba(255,255,255,0.72)]";
  const titleClassName = isDark ? "text-white" : "text-slate-900";
  const subtitleClassName = isDark ? "text-slate-100" : "text-slate-700";
  const textMutedClassName = isDark ? "text-slate-300" : "text-slate-600";
  const labelClassName = isDark ? "text-slate-300" : "text-slate-600";
  const dividerClassName = isDark ? "border-white/10" : "border-slate-200/90";
  const infoCardClassName = isDark
    ? "border-white/10 bg-white/6"
    : "border-slate-200/90 bg-white/82";
  const infoCurrentVersionClassName = isDark ? "text-white" : "text-slate-900";
  const headerBackground = isDark
    ? "radial-gradient(circle at top left, rgba(239,68,68,0.18), transparent 30%), radial-gradient(circle at top right, rgba(59,130,246,0.24), transparent 28%), linear-gradient(135deg, rgba(67,56,202,0.88), rgba(59,130,246,0.82) 58%, rgba(37,99,235,0.9))"
    : "radial-gradient(circle at top left, rgba(239,68,68,0.18), transparent 34%), radial-gradient(circle at top right, rgba(59,130,246,0.2), transparent 28%), linear-gradient(135deg, rgba(99,102,241,0.72), rgba(96,165,250,0.62) 56%, rgba(59,130,246,0.74))";
  const headerWaves = isDark
    ? "repeating-radial-gradient(circle at top right, rgba(255,255,255,0.16) 0, rgba(255,255,255,0.16) 1px, transparent 1px, transparent 12px)"
    : "repeating-radial-gradient(circle at top right, rgba(255,255,255,0.28) 0, rgba(255,255,255,0.28) 1px, transparent 1px, transparent 12px)";
  const glowClassName = isDark ? "bg-red-400/10" : "bg-red-300/20";
  const accentGlowClassName = isDark ? "bg-sky-400/10" : "bg-sky-300/20";

  return (
    <div className="overflow-hidden rounded-[20px]">
      <div className={`relative overflow-hidden rounded-[20px] ${shellClassName}`}>
        <div
          className={`pointer-events-none absolute -top-14 left-3 h-28 w-28 rounded-full blur-3xl ${glowClassName}`}
        />
        <div
          className={`pointer-events-none absolute top-0 right-0 h-36 w-36 rounded-full blur-3xl ${accentGlowClassName}`}
        />
        <div
          className="relative overflow-hidden px-5 py-4 sm:px-6 sm:py-4"
          style={{
            background: headerBackground
          }}
        >
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-2/3 opacity-35"
            style={{
              background: headerWaves
            }}
          />
          <img src={logoText} alt="logo" className="relative h-10 w-auto object-contain" />
        </div>

        <div className={`relative px-5 py-5 sm:px-6 ${surfaceClassName}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#76a9ff] text-[#2f5ecf]">
              <CheckCircleFilled className="text-[16px]" />
            </div>
            <div className="min-w-0 pt-0.5">
              <div
                className={`text-[17px] leading-6 font-semibold sm:text-[18px] ${titleClassName}`}
              >
                {hasUpdate ? "Đã tìm thấy phiên bản mới" : "Bạn đang dùng phiên bản mới nhất"}
              </div>
              {!hasUpdate && (
                <div
                  className={`mt-1 text-[14px] leading-5 font-semibold sm:text-[15px] ${subtitleClassName}`}
                >
                  {currentVersion ? `Phiên bản ${currentVersion}` : "Đang tải thông tin phiên bản"}
                </div>
              )}
            </div>
          </div>

          {hasUpdate && (
            <div className={`mt-4 rounded-2xl border px-4 py-4 ${infoCardClassName}`}>
              <div className={`text-[14px] leading-5 ${textMutedClassName}`}>
                Phiên bản hiện tại:{" "}
                <span className={`font-semibold ${infoCurrentVersionClassName}`}>
                  {currentVersion}
                </span>
              </div>
              <div className={`mt-2 text-[14px] leading-5 ${textMutedClassName}`}>
                Phiên bản mới nhất:{" "}
                <span className="font-semibold text-[#8fb7ff]">{latestVersion}</span>
              </div>
              <Button
                type="primary"
                size="large"
                icon={<CloudDownloadOutlined />}
                className="mt-4 h-10 rounded-xl px-5 text-[14px] font-medium"
                loading={isChecking || isDownloading}
                onClick={onUpdateNow}
              >
                Cập nhật ngay
              </Button>
            </div>
          )}

          <div className={`mt-5 border-t pt-4 ${dividerClassName}`}>
            <div className={`mb-4 text-[16px] font-semibold ${titleClassName} sm:text-[17px]`}>
              Liên hệ
            </div>
            <div className="space-y-3 text-base leading-6">
              <div className="flex flex-wrap gap-x-2">
                <span className={`font-normal w-17.5 ${labelClassName}`}>Tác giả:</span>
                <span className="font-semibold text-orange-500">Nguyễn Cảnh Hưng</span>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <span className={`font-normal w-17.5 ${labelClassName}`}>Email:</span>
                <a
                  href="mailto:hungnc.dev@gmail.com"
                  className="font-normal text-[#3b82f6] hover:text-[#2563eb] dark:text-[#76a9ff] dark:hover:text-[#9ec1ff]"
                >
                  hungnc.dev@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-5">
            <Button
              type="primary"
              size="large"
              className="h-10 rounded-xl px-5 text-[14px] font-medium"
              onClick={onClose}
            >
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionInfoModalContent;
