import MainCard from "@/components/main-card";
import SecondaryCard from "@/components/secondary-card";
import { TicketIcon, PrinterIcon, GiftIcon } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import RetailTicketSaleCard from "@/components/dashboard/retail-ticket-sale-card";
import OnlineTicketPrintCard from "@/components/dashboard/online-ticket-print-card";
import GiftVoucherPrintCard from "@/components/dashboard/gift-voucher-print-card";

const DashboardPage = () => {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[32px]">Xin chào, Cán bộ Hoàng Lân!</h2>
          <p className="text-trunks">
            {format(new Date(), "EEEE, 'ngày' d 'tháng' M 'năm' yyyy", {
              locale: vi,
            })}
          </p>
        </div>
        <div>
          <div className="bg-goku py-[6px] px-3 rounded-[10px] font-bold text-lg">
            Máy: JQK
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-8">
        <RetailTicketSaleCard />
        <OnlineTicketPrintCard />
        <GiftVoucherPrintCard />
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
