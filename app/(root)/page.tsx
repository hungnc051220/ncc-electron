import MainCard from "@/components/main-card";
import SecondaryCard from "@/components/secondary-card";
import { TicketIcon, PrinterIcon, GiftIcon } from "lucide-react";

const DashboardPage = () => {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[32px]">Xin chào, Cán bộ Hoàng Lân!</h2>
          <p>Thứ 4, ngày 18 tháng 9 năm 2025</p>
        </div>
        <div>
          <div className="bg-gray-100 py-[6px] px-3 rounded-[10px] font-bold text-lg">
            Máy: JQK
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-8">
        <MainCard
          title="Bán vé khách lẻ"
          description="Lorem ipsum dolor sit amet consectetur elit"
          color="red"
          icon={TicketIcon}
        />
        <MainCard
          title="In vé online"
          description="Lorem ipsum dolor sit amet consectetur elit"
          color="blue"
          icon={PrinterIcon}
        />
        <MainCard
          title="In voucher quà tặng"
          description="Lorem ipsum dolor sit amet consectetur elit"
          color="green"
          icon={GiftIcon}
        />
      </div>

      <div className="grid grid-cols-4 gap-6 mt-8">
        <SecondaryCard
          title="Bán vé khách lẻ"
          description="Xem sơ đồ bán vé"
          icon={TicketIcon}
          color="text-yellow-500"
        />
        <SecondaryCard
          title="Thống kê doanh thu bán vé"
          description="Thống kê doanh thu bán vé"
          icon={TicketIcon}
          color="text-red-500"
        />
        <SecondaryCard
          title="Báo cáo bán vé xem phim"
          description="Báo cáo bán vé xem phim"
          icon={TicketIcon}
          color="text-green-500"
        />
        <SecondaryCard
          title="Thay đổi mật khẩu"
          description="Thay đổi mật khẩu"
          icon={TicketIcon}
          color="text-blue-700"
        />
      </div>
    </div>
  );
};

export default DashboardPage;
