import MainCard from "@/components/main-card";
import SecondaryCard from "@/components/secondary-card";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { GiftIcon, PrinterIcon, TicketIcon } from "lucide-react";

const DashboardPage = () => {
  return (
    <div className="overflow-hidden">
      <div className="flex items-center justify-between mt-10">
        <div>
          <h2 className="font-bold text-2xl xl:text-3xl">
            Xin chào, Cán bộ Hoàng Lân!
          </h2>
          <p className="text-trunks text-sm xl:text-base">
            {format(new Date(), "EEEE, 'ngày' d 'tháng' M 'năm' yyyy", {
              locale: vi,
            })}
          </p>
        </div>
        <div>
          <div className="bg-goku py-2 px-3 rounded-[10px] font-bold text-sm xl:text-base">
            Máy: JQK
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-6">
        <MainCard
          title="Bán vé khách lẻ"
          description="Tạo và bán vé xem phim cho khách lẻ tại quầy"
          color="red"
          icon={TicketIcon}
          href="retail-ticket-sales"
        />
        <MainCard
          title="In vé online"
          description="Tra cứu và in lại vé đã đặt online cho khách hàng"
          color="blue"
          icon={PrinterIcon}
        />
        <MainCard
          title="In voucher quà tặng"
          description="Phát hành và in voucher quà tặng cho khách hàng, đối tác"
          color="green"
          icon={GiftIcon}
        />
      </div>

      <div className="grid grid-cols-4 gap-6 mt-8">
        <SecondaryCard
          title="Sơ đồ bán vé"
          description="Xem nhanh sơ đồ ghế và trạng thái bán vé theo suất chiếu"
          icon={TicketIcon}
          color="text-yellow-500"
        />
        <SecondaryCard
          title="Thống kê doanh thu bán vé"
          description="Theo dõi doanh thu bán vé theo ca, ngày hoặc khoảng thời gian"
          icon={TicketIcon}
          color="text-red-500"
        />
        <SecondaryCard
          title="Báo cáo bán vé xem phim"
          description="Xem báo cáo chi tiết tình hình bán vé xem phim"
          icon={TicketIcon}
          color="text-green-500"
        />
        <SecondaryCard
          title="Thay đổi mật khẩu"
          description="Cập nhật và thay đổi mật khẩu đăng nhập hệ thống"
          icon={TicketIcon}
          color="text-blue-700"
        />
      </div>
    </div>
  );
};

export default DashboardPage;
