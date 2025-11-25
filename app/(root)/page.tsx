import Header from "@/components/header";
import MainCard from "@/components/main-card";
import SecondaryCard from "@/components/secondary-card";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { GiftIcon, PrinterIcon, TicketIcon } from "lucide-react";

const DashboardPage = () => {
  return (
    <div className="overflow-hidden">
      <Header />
      <div className="flex items-center justify-between mt-10">
        <div>
          <h2 className="font-bold text-2xl">Xin chào, Cán bộ Hoàng Lân!</h2>
          <p className="text-trunks text-sm">
            {format(new Date(), "EEEE, 'ngày' d 'tháng' M 'năm' yyyy", {
              locale: vi,
            })}
          </p>
        </div>
        <div>
          <div className="bg-goku py-2 px-3 rounded-[10px] font-bold text-sm">
            Máy: JQK
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-6">
        <MainCard
          title="Bán vé khách lẻ"
          description="Lorem ipsum dolor sit amet consectetur elit"
          color="red"
          icon={TicketIcon}
          href="retail-ticket-sales"
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
          title="Sơ đồ bán vé"
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
