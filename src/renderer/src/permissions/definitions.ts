import type { PermissionAction, PermissionDefinition } from "@shared/types";

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  access: "Truy cập",
  list: "Xem DS",
  view: "Chi tiết",
  create: "Thêm",
  update: "Sửa",
  delete: "Xóa",
  approve: "Duyệt",
  export: "Xuất",
  print: "In",
  configure: "Cấu hình"
};

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  {
    key: "users",
    module: "Hệ thống",
    label: "Quản lý người dùng",
    route: "/users",
    actions: ["access", "list", "view", "create", "update", "delete"]
  },
  {
    key: "user_roles",
    module: "Hệ thống",
    label: "Phân quyền nhóm người dùng",
    route: "/user-roles",
    actions: ["access", "list", "view", "update", "configure"]
  },
  {
    key: "machine_serials",
    module: "Hệ thống",
    label: "Xem seri máy",
    route: "/machine-serials",
    actions: ["access", "list", "view"]
  },
  {
    key: "settings",
    module: "Hệ thống",
    label: "Thiết lập hệ thống",
    route: "/settings",
    actions: ["access", "view", "update", "configure"]
  },
  {
    key: "films",
    module: "Quản lý danh sách",
    label: "Danh sách phim",
    route: "/films",
    actions: ["access", "list", "view", "create", "update", "delete"]
  },
  {
    key: "manufacturers",
    module: "Quản lý danh sách",
    label: "Danh sách hãng phim",
    route: "/manufacturers",
    actions: ["access", "list", "view", "create", "update", "delete"]
  },
  {
    key: "invoices",
    module: "Quản lý danh sách",
    label: "Hóa đơn điện tử",
    route: "/invoices",
    actions: ["access", "list", "view", "create", "update", "print"]
  },
  {
    key: "revenue_sharing",
    module: "Quản lý danh sách",
    label: "Quản lý phân chia doanh thu",
    route: "/revenue-sharing",
    actions: ["access", "list", "view", "create", "update", "delete", "export"]
  },
  {
    key: "seat_types",
    module: "Quản lý danh sách",
    label: "Loại ghế, vị trí",
    route: "/seat-types",
    actions: ["access", "list", "view", "create", "update", "delete"]
  },
  {
    key: "screening_rooms",
    module: "Quản lý danh sách",
    label: "Phòng chiếu",
    route: "/screening-rooms",
    actions: ["access", "list", "view", "create", "update", "delete", "configure"]
  },
  {
    key: "holidays",
    module: "Quản lý danh sách",
    label: "Ngày lễ",
    route: "/holidays",
    actions: ["access", "list", "view", "create", "update", "delete"]
  },
  {
    key: "showtime_slots",
    module: "Quản lý danh sách",
    label: "Khung giờ chiếu",
    route: "/showtime-slots",
    actions: ["access", "list", "view", "create", "update", "delete"]
  },
  {
    key: "cancellation_reasons",
    module: "Quản lý danh sách",
    label: "Lý do hủy vé",
    route: "/cancellation-reasons",
    actions: ["access", "list", "view", "create", "update", "delete"]
  },
  {
    key: "ticket_prices",
    module: "Quản lý danh sách",
    label: "Giá vé",
    route: "/ticket-prices",
    actions: ["access", "list", "view", "create", "update", "delete"]
  },
  {
    key: "vouchers",
    module: "Quản lý danh sách",
    label: "Chương trình khuyến mãi",
    route: "/vouchers",
    actions: ["access", "list", "view", "create", "update", "delete"]
  },
  {
    key: "plan_cinema",
    module: "Kế hoạch chiếu phim",
    label: "Lập kế hoạch chiếu phim",
    route: "/plan-cinema",
    actions: ["access", "list", "view", "create", "update", "delete", "approve"]
  },
  {
    key: "showtime_schedule",
    module: "Kế hoạch chiếu phim",
    label: "Xem lịch chiếu phim",
    route: "/showtime-schedule",
    actions: ["access", "list", "view"]
  },
  {
    key: "plan_screening",
    module: "Kế hoạch chiếu phim",
    label: "Lập lịch suất chiếu",
    route: "/plan-screening/:id",
    actions: ["access", "view", "create", "update", "delete", "configure"]
  },
  {
    key: "online_seat_booking",
    module: "Kế hoạch chiếu phim",
    label: "Thiết lập bán online theo ghế",
    route: "/online-seat-booking/create",
    actions: ["access", "view", "update", "configure"]
  },
  {
    key: "online_showtime_booking",
    module: "Kế hoạch chiếu phim",
    label: "Thiết lập bán online theo ca chiếu",
    route: "/online-showtime-booking",
    actions: ["access", "list", "view", "update", "configure"]
  },
  {
    key: "discount_settings",
    module: "Kế hoạch chiếu phim",
    label: "Thiết lập giảm giá",
    route: "/discount-settings",
    actions: ["access", "list", "view", "create", "update", "delete", "configure"]
  },
  {
    key: "showtimes",
    module: "Bán vé",
    label: "Bán vé khách lẻ",
    route: "/showtimes",
    actions: ["access", "list", "view", "create", "update", "print"]
  },
  {
    key: "print_online_tickets",
    module: "Bán vé",
    label: "In vé online",
    route: "/print-online-tickets",
    actions: ["access", "list", "view", "print"]
  },
  {
    key: "find_online_tickets",
    module: "Bán vé",
    label: "Tìm vé online",
    route: "/find-online-tickets",
    actions: ["access", "list", "view"]
  },
  {
    key: "cancellation_tickets",
    module: "Bán vé",
    label: "Quản lý vé hủy",
    route: "/cancellation-tickets",
    actions: ["access", "list", "view", "update", "delete"]
  },
  {
    key: "refunds",
    module: "Bán vé",
    label: "Hoàn tiền",
    route: "/refunds",
    actions: ["access", "list", "view", "update", "approve"]
  },
  {
    key: "invitation_tickets",
    module: "Bán vé",
    label: "Quản lý giấy mời",
    route: "/invitation-tickets",
    actions: ["access", "list", "view", "create", "update", "delete", "print"]
  },
  {
    key: "contract_ticket_sales",
    module: "Bán vé",
    label: "Bán vé hợp đồng",
    route: "/contract-ticket-sales",
    actions: ["access", "list", "view", "create", "update", "delete", "print"]
  },
  {
    key: "ticket_sales_revenue",
    module: "Bán vé",
    label: "Thống kê doanh thu bán vé",
    route: "/ticket-sales-revenue",
    actions: ["access", "list", "view", "export"]
  },
  {
    key: "access_history",
    module: "Tra cứu",
    label: "Lịch sử hoạt động",
    route: "/access-history",
    actions: ["access", "list", "view", "export"]
  },
  {
    key: "order_history",
    module: "Tra cứu",
    label: "Lịch sử bán vé",
    route: "/order-history",
    actions: ["access", "list", "view", "export"]
  },
  {
    key: "staff_revenue_report",
    module: "Thống kê, báo cáo",
    label: "Doanh thu theo nhân viên",
    route: "/staff-revenue-report",
    actions: ["access", "list", "view", "export"]
  },
  {
    key: "monthly_report",
    module: "Thống kê, báo cáo",
    label: "Báo cáo tháng",
    route: "/monthly-report",
    actions: ["access", "list", "view", "export"]
  },
  {
    key: "quarterly_report",
    module: "Thống kê, báo cáo",
    label: "Báo cáo quý",
    route: "/quarterly-report",
    actions: ["access", "list", "view", "export"]
  },
  {
    key: "yearly_report",
    module: "Thống kê, báo cáo",
    label: "Báo cáo năm",
    route: "/yearly-report",
    actions: ["access", "list", "view", "export"]
  }
];

export const DEFAULT_PERMISSION_ACTIONS: PermissionAction[] = [
  "access",
  "list",
  "view",
  "create",
  "update",
  "delete"
];
