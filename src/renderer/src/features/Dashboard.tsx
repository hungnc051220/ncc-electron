import MainCard from "@renderer/components/cards/MainCard";
import SecondaryCard from "@renderer/components/cards/SecondaryCard";
import dayjs from "dayjs";
import mainIcon1 from "@renderer/assets/icons/confirmation_number.svg";
import mainIcon2 from "@renderer/assets/icons/redeem.svg";
import mainIcon3 from "@renderer/assets/icons/print.svg";
import secondaryIcon1 from "@renderer/assets/icons/drag_indicator.svg";
import secondaryIcon2 from "@renderer/assets/icons/insert_chart.svg";
import secondaryIcon3 from "@renderer/assets/icons/summarize.svg";
import secondaryIcon4 from "@renderer/assets/icons/password.svg";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { useAuthStore } from "@renderer/store/auth.store";
import Logout from "@renderer/components/Logout";

const Dashboard = () => {
  const userId = useAuthStore((s) => s.userId);
  const { data: user } = useUserDetail(userId!);

  const date = dayjs();
  const dateFormat = `${date.format("dddd")}, ngày ${date.format("D [tháng] M [năm] YYYY")}`;

  return (
    <main className="flex-1 max-w-7xl mx-auto px-4">
      <div className="flex items-center justify-between mt-10">
        <div>
          <div className="flex gap-4 items-center">
            <h2 className="font-bold text-2xl xl:text-3xl">
              Xin chào, <span className="text-primary">{user?.fullname}</span>
            </h2>
            <Logout />
          </div>
          <p className="text-trunks text-sm xl:text-base capitalize">{dateFormat}</p>
        </div>
        <div>
          <div className="bg-goku py-2 px-3 rounded-[10px] font-bold text-sm xl:text-base">
            Máy: JQK
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 flex-1">
        <MainCard
          title="Bán vé khách lẻ"
          description="Tạo và bán vé xem phim cho khách lẻ tại quầy"
          color="red"
          href="showtimes"
          icon={mainIcon1}
        />
        <MainCard
          title="In vé online"
          description="Tra cứu và in lại vé đã đặt online cho khách hàng"
          color="blue"
          href="print-online-tickets"
          icon={mainIcon2}
        />
        <MainCard
          title="In voucher quà tặng"
          description="Phát hành và in voucher quà tặng cho khách hàng, đối tác"
          color="green"
          icon={mainIcon3}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4 flex-1">
        <SecondaryCard
          title="Sơ đồ bán vé"
          description="Xem nhanh sơ đồ ghế và trạng thái bán vé theo suất chiếu"
          color="text-yellow-500"
          icon={secondaryIcon1}
        />
        <SecondaryCard
          title="Doanh thu bán vé"
          description="Theo dõi doanh thu bán vé theo ca, ngày hoặc khoảng thời gian"
          color="text-red-500"
          href="ticket-sales-revenue"
          icon={secondaryIcon2}
        />
        <SecondaryCard
          title="Báo cáo bán vé"
          description="Xem báo cáo chi tiết tình hình bán vé xem phim"
          color="text-green-500"
          href="staff-revenue-report"
          icon={secondaryIcon3}
        />
        <SecondaryCard
          title="Thay đổi mật khẩu"
          description="Cập nhật và thay đổi mật khẩu đăng nhập hệ thống"
          color="text-blue-700"
          href="settings"
          icon={secondaryIcon4}
        />
      </div>
    </main>
  );
};

export default Dashboard;
