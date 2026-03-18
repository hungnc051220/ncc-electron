import mainIcon1 from "@renderer/assets/icons/confirmation_number.svg";
import secondaryIcon1 from "@renderer/assets/icons/drag_indicator.svg";
import secondaryIcon2 from "@renderer/assets/icons/insert_chart.svg";
import secondaryIcon4 from "@renderer/assets/icons/password.svg";
import mainIcon3 from "@renderer/assets/icons/print.svg";
import mainIcon2 from "@renderer/assets/icons/redeem.svg";
import secondaryIcon3 from "@renderer/assets/icons/summarize.svg";
import MainCard from "@renderer/components/cards/MainCard";
import bgDashboard from "@renderer/assets/images/bg-dashboard.png";
import SecondaryCard from "@renderer/components/cards/SecondaryCard";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { useAuthStore } from "@renderer/store/auth.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import dayjs from "dayjs";

const Dashboard = () => {
  const userId = useAuthStore((s) => s.userId);
  const { data: user } = useUserDetail(userId!);
  const { posName } = useSettingPosStore();

  const date = dayjs();
  const dateFormat = `${date.format("dddd")}, ngày ${date.format("D [tháng] M [năm] YYYY")}`;

  return (
    <main className="relative flex-1 overflow-hidden h-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.14),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))]" />
        <div className="absolute -top-16 left-8 h-40 w-40 rounded-full bg-red-200/40 blur-3xl" />
        <div className="absolute top-24 right-0 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-44 w-44 rounded-full bg-amber-100/40 blur-3xl" />
      </div>

      <div className="absolute right-0 bottom-0">
        <img src={bgDashboard} alt="bg-dashboard" className="h-full w-full object-cover" />
      </div>

      <div className="relative mx-auto flex h-full max-w-7xl px-4 py-8 lg:py-10">
        <div className="w-full">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex gap-4 items-center">
                <h2 className="font-bold text-2xl xl:text-3xl">
                  Xin chào, <span className="text-primary">{user?.fullname}</span>
                </h2>
              </div>
              <p className="text-trunks text-sm xl:text-base capitalize">{dateFormat}</p>
            </div>
            <div>
              <div className="rounded-[14px] border border-white/70 bg-white/80 py-2 px-3 font-bold text-sm shadow-sm xl:text-base">
                Máy: {posName}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 flex-1">
            <MainCard
              title="Bán vé khách lẻ"
              description="Bán vé trực tiếp cho khách tại quầy giao dịch."
              color="red"
              href="showtimes"
              icon={mainIcon1}
            />
            <MainCard
              title="In vé online"
              description="Tra cứu mã đặt chỗ và in vé online cho khách."
              color="blue"
              href="print-online-tickets"
              icon={mainIcon2}
            />
            <MainCard
              title="Chương trình KM"
              description="Phát hành voucher, quà tặng và ưu đãi cho khách."
              color="green"
              href="vouchers"
              icon={mainIcon3}
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
