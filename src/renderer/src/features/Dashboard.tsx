import mainIcon1 from "@renderer/assets/icons/confirmation_number.svg";
import secondaryIcon1 from "@renderer/assets/icons/drag_indicator.svg";
import secondaryIcon2 from "@renderer/assets/icons/insert_chart.svg";
import secondaryIcon4 from "@renderer/assets/icons/password.svg";
import mainIcon3 from "@renderer/assets/icons/print.svg";
import mainIcon2 from "@renderer/assets/icons/redeem.svg";
import secondaryIcon3 from "@renderer/assets/icons/summarize.svg";
import MainCard from "@renderer/components/cards/MainCard";
import bgDashboard from "@renderer/assets/images/bg-dashboard.png";
import backgroundVideo from "@renderer/assets/videos/background-video.mp4";
import SecondaryCard from "@renderer/components/cards/SecondaryCard";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { useAuthStore } from "@renderer/store/auth.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import { useThemeStore } from "@renderer/store/theme.store";
import dayjs from "dayjs";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

const Dashboard = () => {
  const userId = useAuthStore((s) => s.userId);
  const { data: user } = useUserDetail(userId!);
  const { posName } = useSettingPosStore();
  const isDarkTheme = useThemeStore((s) => s.theme === "dark");
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  const date = dayjs();
  const dateFormat = `${date.format("dddd")}, ngày ${date.format("D [tháng] M [năm] YYYY")}`;

  useEffect(() => {
    if (!isDarkTheme) {
      setIsVideoMuted(true);
    }
  }, [isDarkTheme]);

  return (
    <main className="relative flex-1 overflow-hidden h-full text-black dark:text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-app-bg dark:hidden" />
        {isDarkTheme && (
          <video
            className="absolute inset-0 size-full object-cover"
            src={backgroundVideo}
            autoPlay
            muted={isVideoMuted}
            loop
            playsInline
            preload="none"
          />
        )}
        <div className="absolute inset-0 hidden bg-black/50 dark:block" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.12),transparent_34%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] dark:bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.1),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />
        <div className="absolute -top-16 left-8 h-40 w-40 rounded-full bg-red-200/35 blur-3xl dark:bg-rose-500/12" />
        <div className="absolute top-24 right-0 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute bottom-10 left-1/3 h-44 w-44 rounded-full bg-amber-100/30 blur-3xl dark:bg-indigo-500/10" />
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 z-0 flex w-[36vw] min-w-[320px] max-w-130 items-end justify-end opacity-100 dark:hidden">
        <img
          src={bgDashboard}
          alt="bg-dashboard"
          className="h-auto max-h-[88%] w-full object-contain object-bottom-right brightness-150 contrast-110 saturate-125 dark:brightness-160 dark:contrast-110"
        />
      </div>

      {isDarkTheme && (
        <button
          type="button"
          className="absolute right-5 bottom-5 z-10 flex size-10 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white shadow-[0_12px_28px_-18px_rgba(0,0,0,0.9)] backdrop-blur-md transition hover:border-white/35 hover:bg-black/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
          title={isVideoMuted ? "Bật âm lượng" : "Tắt âm lượng"}
          aria-label={isVideoMuted ? "Bật âm lượng video nền" : "Tắt âm lượng video nền"}
          onClick={() => setIsVideoMuted((muted) => !muted)}
        >
          {isVideoMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      )}

      <div className="relative mx-auto flex h-full max-w-7xl px-6 py-8 lg:py-10">
        <div className="w-full">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex gap-4 items-center">
                <h2 className="font-bold text-2xl xl:text-3xl">
                  Xin chào, <span className="text-primary">{user?.fullname}</span>
                </h2>
              </div>
              <p className="text-trunks text-sm capitalize dark:text-slate-200/75 xl:text-base">
                {dateFormat}
              </p>
            </div>
            <div>
              <div className="rounded-[14px] border border-white/70 bg-white/80 py-2 px-3 font-bold text-sm shadow-sm xl:text-base dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_12px_30px_-18px_rgba(0,0,0,0.8)]">
                Máy: {posName}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 flex-1">
            <MainCard
              title="Bán vé khách lẻ"
              description="Bán vé trực tiếp cho khách tại quầy giao dịch."
              color="red"
              href="showtimes?resetDate=1"
              icon={mainIcon1}
            />
            <MainCard
              title="In vé online"
              description="Tra cứu mã đặt chỗ và in vé online cho khách."
              color="blue"
              href="print-online-tickets"
              icon={mainIcon3}
            />
            <MainCard
              title="Chương trình KM"
              description="Phát hành voucher, quà tặng và ưu đãi cho khách."
              color="green"
              href="vouchers"
              icon={mainIcon2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4 flex-1">
            <SecondaryCard
              title="Sơ đồ bán vé"
              description="Xem sơ đồ ghế và tình trạng bán vé theo suất."
              color="text-yellow-500"
              href="showtimes?callbackUrl=/ticket-sales-diagram&id=view"
              icon={secondaryIcon1}
            />
            <SecondaryCard
              title="Doanh thu bán vé"
              description="Theo dõi doanh thu theo ca, ngày hoặc thời gian chọn."
              color="text-red-500"
              href="ticket-sales-revenue"
              icon={secondaryIcon2}
            />
            <SecondaryCard
              title="Báo cáo bán vé"
              description="Xem nhanh báo cáo tổng hợp và chi tiết bán vé."
              color="text-green-500"
              href="staff-revenue-report"
              icon={secondaryIcon3}
            />
            <SecondaryCard
              title="Thay đổi mật khẩu"
              description="Cập nhật mật khẩu đăng nhập của tài khoản hiện tại."
              color="text-blue-700"
              href="settings"
              icon={secondaryIcon4}
            />
          </div>
        </div>
      </div>
    </main>
  );
};

export default Dashboard;
