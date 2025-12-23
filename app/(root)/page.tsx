import Footer from "@/components/footer";
import Logout from "@/components/logout";
import MainCard from "@/components/main-card";
import SecondaryCard from "@/components/secondary-card";
import { getUser } from "@/data/loaders";
import { decodeToken } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { GiftIcon, PrinterIcon, TicketIcon } from "lucide-react";
import { cookies } from "next/headers";

const DashboardPage = async () => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const userId = decodeToken(accessToken as string)?.user_id;

  const user = await getUser(userId as number);
  const fullName = user?.fullname;

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mt-10">
          <div>
            <div className="flex gap-4 items-center">
              <h2 className="font-bold text-2xl xl:text-3xl">
                Xin chào, <span className="text-primary">{fullName}</span>
              </h2>
              <Logout />
            </div>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mt-6 flex-1">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mt-6 flex-1">
          <SecondaryCard
            title="Sơ đồ bán vé"
            description="Xem nhanh sơ đồ ghế và trạng thái bán vé theo suất chiếu"
            icon={TicketIcon}
            color="text-yellow-500"
          />
          <SecondaryCard
            title="Doanh thu bán vé"
            description="Theo dõi doanh thu bán vé theo ca, ngày hoặc khoảng thời gian"
            icon={TicketIcon}
            color="text-red-500"
          />
          <SecondaryCard
            title="Báo cáo bán vé"
            description="Xem báo cáo chi tiết tình hình bán vé xem phim"
            icon={TicketIcon}
            color="text-green-500"
          />
          <SecondaryCard
            title="Thay đổi mật khẩu"
            description="Cập nhật và thay đổi mật khẩu đăng nhập hệ thống"
            icon={TicketIcon}
            color="text-blue-700"
            href="change-password"
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DashboardPage;
