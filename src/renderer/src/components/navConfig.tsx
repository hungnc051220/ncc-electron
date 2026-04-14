import type { ReactNode } from "react";

export type NavConfigItem = {
  label: ReactNode;
  key: string;
  permissionKey?: string;
  onClickKey?: "showVersionInfo";
  to?: string;
  matchPaths?: string[];
  hiddenInMenu?: boolean;
  children?: NavConfigItem[];
};

export const navConfig: NavConfigItem[] = [
  {
    label: "Hệ thống",
    key: "system",
    children: [
      {
        label: "Quản lý người dùng",
        key: "users",
        permissionKey: "users",
        to: "/users"
      },
      {
        label: "Quản lý nhóm người dùng",
        key: "customer-roles",
        permissionKey: "user_roles",
        to: "/customer-roles"
      },
      {
        label: "Phân nhóm quyền người dùng",
        key: "user-roles",
        permissionKey: "user_roles",
        to: "/user-roles"
      },
      {
        label: "Xem Seri máy",
        key: "machine-serials",
        permissionKey: "machine_serials",
        to: "/machine-serials"
      },
      {
        label: "Cài đặt",
        key: "settings",
        to: "/settings",
        hiddenInMenu: true
      },
      {
        label: "Thông tin phiên bản",
        key: "check-update",
        onClickKey: "showVersionInfo"
      }
    ]
  },
  {
    label: "Quản lý danh sách",
    key: "management",
    children: [
      { label: "Danh sách phim", key: "films", permissionKey: "films", to: "/films" },
      {
        label: "Danh sách hãng phim",
        key: "manufacturers",
        permissionKey: "manufacturers",
        to: "/manufacturers"
      },
      {
        label: "Danh sách thể loại phim",
        key: "film-categories",
        permissionKey: "films",
        to: "/film-categories"
      },
      {
        label: "Danh sách hóa đơn điện tử",
        key: "invoices",
        permissionKey: "invoices",
        to: "/invoices"
      },
      {
        label: "Quản lý phân chia doanh thu",
        key: "revenue-sharing",
        permissionKey: "revenue_sharing",
        to: "/revenue-sharing"
      },
      {
        label: "Danh sách loại ghế, vị trí",
        key: "seat-types",
        permissionKey: "seat_types",
        to: "/seat-types"
      },
      {
        label: "Danh sách phòng chiếu",
        key: "screening-rooms",
        permissionKey: "screening_rooms",
        to: "/screening-rooms",
        matchPaths: ["/screening-rooms", "/screening-rooms/:id/seat-map"]
      },
      {
        label: "Danh sách ngày lễ",
        key: "holidays",
        permissionKey: "holidays",
        to: "/holidays"
      },
      {
        label: "Danh sách khung giờ chiếu",
        key: "showtime-slots",
        permissionKey: "showtime_slots",
        to: "/showtime-slots"
      },
      {
        label: "Danh sách lý do hủy vé",
        key: "cancellation-reasons",
        permissionKey: "cancellation_reasons",
        to: "/cancellation-reasons"
      },
      {
        label: "Danh sách giá vé",
        key: "ticket-prices",
        permissionKey: "ticket_prices",
        to: "/ticket-prices"
      },
      {
        label: "Danh sách chương trình khuyến mãi",
        key: "vouchers",
        permissionKey: "vouchers",
        to: "/vouchers"
      }
    ]
  },
  {
    label: "Kế hoạch chiếu phim",
    key: "planning",
    children: [
      {
        label: "Lập kế hoạch chiếu phim",
        key: "plan-cinema",
        permissionKey: "plan_cinema",
        to: "/plan-cinema"
      },
      {
        label: "Xem lịch chiếu phim",
        key: "showtime-schedule",
        permissionKey: "showtime_schedule",
        to: "/showtime-schedule"
      },
      {
        label: "Thiết lập bán online theo ghế",
        key: "online-seat-booking",
        permissionKey: "online_seat_booking",
        to: "/showtimes?callbackUrl=/online-seat-booking&id=create",
        matchPaths: ["/online-seat-booking/create"]
      },
      {
        label: "Thiết lập bán online theo ca chiếu",
        key: "online-showtime-booking",
        permissionKey: "online_showtime_booking",
        to: "/online-showtime-booking"
      },
      {
        label: "Thiết lập giảm giá",
        key: "discount-settings",
        permissionKey: "discount_settings",
        to: "/discount-settings"
      }
    ]
  },
  {
    label: "Bán vé",
    key: "ticket-sales",
    children: [
      {
        label: "Bán vé khách lẻ",
        key: "showtimes",
        permissionKey: "showtimes",
        to: "/showtimes?resetDate=1"
      },
      {
        label: "In vé online",
        key: "print-online-tickets",
        permissionKey: "print_online_tickets",
        to: "/print-online-tickets"
      },
      {
        label: "Tìm vé online",
        key: "find-online-tickets",
        permissionKey: "find_online_tickets",
        to: "/find-online-tickets"
      },
      {
        label: "Quản lý vé hủy",
        key: "cancellation-tickets",
        permissionKey: "cancellation_tickets",
        to: "/cancellation-tickets"
      },
      { label: "Hoàn tiền", key: "refunds", permissionKey: "refunds", to: "/refunds" },
      {
        label: "Quản lý giấy mời",
        key: "invitation-tickets",
        permissionKey: "invitation_tickets",
        to: "/invitation-tickets",
        matchPaths: ["/invitation-tickets", "/invitation-tickets/create"]
      },
      {
        label: "Bán vé hợp đồng",
        key: "contract-ticket-sales",
        permissionKey: "contract_ticket_sales",
        to: "/contract-ticket-sales",
        matchPaths: ["/contract-ticket-sales", "/contract-ticket-sales/:id"]
      },
      {
        label: "Thống kê doanh thu bán vé",
        key: "ticket-sales-revenue",
        permissionKey: "ticket_sales_revenue",
        to: "/ticket-sales-revenue",
        matchPaths: ["/ticket-sales-revenue", "/ticket-sales-diagram/view"]
      }
    ]
  },
  {
    label: "Tra cứu",
    key: "lookup",
    children: [
      {
        label: "Lịch sử hoạt động",
        key: "access-history",
        permissionKey: "access_history",
        to: "/access-history"
      },
      {
        label: "Lịch sử bán vé",
        key: "order-history",
        permissionKey: "order_history",
        to: "/order-history",
        matchPaths: ["/order-history", "/order-history/swap-seats/:id"]
      }
    ]
  },
  {
    label: "Thống kê, báo cáo",
    key: "reports",
    children: [
      {
        label: "Báo cáo vé bán, doanh thu theo nhân viên",
        key: "staff-revenue-report",
        permissionKey: "staff_revenue_report",
        to: "/staff-revenue-report"
      },
      {
        label: "Báo cáo tháng",
        key: "monthly-report",
        permissionKey: "monthly_report",
        to: "/monthly-report"
      },
      {
        label: "Báo cáo quý",
        key: "quarterly-report",
        permissionKey: "quarterly_report",
        to: "/quarterly-report"
      },
      {
        label: "Báo cáo năm",
        key: "yearly-report",
        permissionKey: "yearly_report",
        to: "/yearly-report"
      }
    ]
  }
];
