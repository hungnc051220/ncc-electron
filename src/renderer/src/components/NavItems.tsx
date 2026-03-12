import { Link } from "react-router";
import type { MenuProps } from "antd";
import { Menu } from "antd";
import { useState } from "react";
import { useUpdater } from "./UpdaterContext";
import { usePermissionStore } from "@renderer/store/permission.store";

type MenuItem = Required<MenuProps>["items"][number];
type NavConfig = {
  label: React.ReactNode;
  key: string;
  permissionKey?: string;
  onClick?: () => void;
  children?: NavConfig[];
};

const NavItems = () => {
  const { manualCheck } = useUpdater();
  const [current, setCurrent] = useState("");
  const can = usePermissionStore((state) => state.can);

  const navConfig: NavConfig[] = [
    {
      label: "Hệ thống",
      key: "system",
      children: [
        {
          label: <Link to="/users">Quản lý người dùng</Link>,
          key: "users",
          permissionKey: "users"
        },
        {
          label: <Link to="/user-roles">Phân nhóm quyền người dùng</Link>,
          key: "user-roles",
          permissionKey: "user_roles"
        },
        {
          label: <Link to="/machine-serials">Xem Seri máy</Link>,
          key: "machine-serials",
          permissionKey: "machine_serials"
        },
        {
          label: "Kiểm tra phiên bản",
          key: "check-update",
          onClick: manualCheck
        }
      ]
    },
    {
      label: "Quản lý danh sách",
      key: "management",
      children: [
        {
          label: <Link to="/films">Danh sách phim</Link>,
          key: "films",
          permissionKey: "films"
        },
        {
          label: <Link to="/manufacturers">Danh sách hãng phim</Link>,
          key: "manufacturers",
          permissionKey: "manufacturers"
        },
        {
          label: <Link to="/invoices">Danh sách hóa đơn điện tử</Link>,
          key: "invoices",
          permissionKey: "invoices"
        },
        {
          label: <Link to="/revenue-sharing">Quản lý phân chia doanh thu</Link>,
          key: "revenue-sharing"
        },
        {
          label: <Link to="/seat-types">Danh sách loại ghế, vị trí</Link>,
          key: "seat-types",
          permissionKey: "seat_types"
        },
        {
          label: <Link to="/screening-rooms">Danh sách phòng chiếu</Link>,
          key: "screening-rooms",
          permissionKey: "screening_rooms"
        },
        {
          label: <Link to="/holidays">Danh sách ngày lễ</Link>,
          key: "holidays",
          permissionKey: "holidays"
        },
        {
          label: <Link to="/showtime-slots">Danh sách khung giờ chiếu</Link>,
          key: "showtime-slots",
          permissionKey: "showtime_slots"
        },
        {
          label: <Link to="/cancellation-reasons">Danh sách lý do hủy vé</Link>,
          key: "cancellation-reasons",
          permissionKey: "cancellation_reasons"
        },
        {
          label: <Link to="/ticket-prices">Danh sách giá vé</Link>,
          key: "ticket-prices",
          permissionKey: "ticket_prices"
        },
        {
          label: <Link to="/vouchers">Danh sách chương trình khuyến mãi</Link>,
          key: "vouchers",
          permissionKey: "vouchers"
        }
      ]
    },
    {
      label: "Kế hoạch chiếu phim",
      key: "planning",
      children: [
        {
          label: <Link to="/plan-cinema">Lập kế hoạch chiếu phim</Link>,
          key: "plan-cinema",
          permissionKey: "plan_cinema"
        },
        {
          label: <Link to="/showtime-schedule">Xem lịch chiếu phim</Link>,
          key: "showtime-schedule",
          permissionKey: "showtime_schedule"
        },
        {
          label: (
            <Link to="/showtimes?callbackUrl=/online-seat-booking&id=create">
              Thiết lập bán online theo ghế
            </Link>
          ),
          key: "online-seat-booking",
          permissionKey: "online_seat_booking"
        },
        {
          label: <Link to="/online-showtime-booking">Thiết lập bán online theo ca chiếu</Link>,
          key: "online-showtime-booking",
          permissionKey: "online_showtime_booking"
        },
        {
          label: <Link to="/discount-settings">Thiết lập giảm giá</Link>,
          key: "discount-settings",
          permissionKey: "discount_settings"
        }
      ]
    },
    {
      label: "Bán vé",
      key: "ticket-sales",
      children: [
        {
          label: <Link to="/showtimes">Bán vé khách lẻ</Link>,
          key: "showtimes",
          permissionKey: "showtimes"
        },
        {
          label: <Link to="/print-online-tickets">In vé online</Link>,
          key: "print-online-tickets",
          permissionKey: "print_online_tickets"
        },
        {
          label: <Link to="/find-online-tickets">Tìm vé online</Link>,
          key: "find-online-tickets",
          permissionKey: "find_online_tickets"
        },
        {
          label: <Link to="/cancellation-tickets">Quản lý vé hủy</Link>,
          key: "cancellation-tickets",
          permissionKey: "cancellation_tickets"
        },
        {
          label: <Link to="/refunds">Hoàn tiền</Link>,
          key: "refunds",
          permissionKey: "refunds"
        },
        {
          label: <Link to="/invitation-tickets">Quản lý giấy mời</Link>,
          key: "invitation-tickets",
          permissionKey: "invitation_tickets"
        },
        {
          label: <Link to="/contract-ticket-sales">Bán vé hợp đồng</Link>,
          key: "contract-ticket-sales",
          permissionKey: "contract_ticket_sales"
        },
        {
          label: <Link to="/ticket-sales-revenue">Thông kê doanh thu bán vé</Link>,
          key: "ticket-sales-revenue",
          permissionKey: "ticket_sales_revenue"
        }
      ]
    },
    {
      label: "Tra cứu",
      key: "lookup",
      children: [
        {
          label: <Link to="/access-history">Lịch sử hoạt động</Link>,
          key: "access-history",
          permissionKey: "access_history"
        },
        {
          label: <Link to="/order-history">Lịch sử bán vé</Link>,
          key: "order-history",
          permissionKey: "order_history"
        }
      ]
    },
    {
      label: "Thống kê, báo cáo",
      key: "reports",
      children: [
        {
          label: <Link to="/staff-revenue-report">Báo cáo vé bán, doanh thu theo nhân viên</Link>,
          key: "staff-revenue-report",
          permissionKey: "staff_revenue_report"
        },
        {
          label: <Link to="/film-sales-detail-report">Báo cáo chi tiết bán vé theo phim</Link>,
          key: "film-sales-detail-report"
        },
        {
          label: <Link to="/monthly-report">Báo cáo tháng</Link>,
          key: "monthly-report",
          permissionKey: "monthly_report"
        },
        {
          label: <Link to="/quarterly-report">Báo cáo quý</Link>,
          key: "quarterly-report",
          permissionKey: "quarterly_report"
        },

        {
          label: <Link to="/annual-report">Báo cáo năm</Link>,
          key: "annual-report"
        }
      ]
    }
  ];

  const toMenuItems = (items: NavConfig[]): MenuItem[] =>
    items
      .map((item) => {
        if (item.permissionKey && !can(item.permissionKey, "access")) {
          return null;
        }

        const children = item.children ? toMenuItems(item.children) : undefined;
        if (item.children && !children?.length) {
          return null;
        }

        return {
          label: item.label,
          key: item.key,
          onClick: item.onClick,
          children
        } as MenuItem;
      })
      .filter(Boolean) as MenuItem[];

  const items = toMenuItems(navConfig);

  const onClick: MenuProps["onClick"] = (e) => {
    setCurrent(e.key);
  };

  return (
    <Menu
      onClick={onClick}
      selectedKeys={[current]}
      mode="horizontal"
      items={items}
      triggerSubMenuAction="click"
      style={{
        minWidth: 0,
        flex: "auto",
        justifyContent: "center",
        border: "none",
        height: "100%"
      }}
    />
  );
};

export default NavItems;
