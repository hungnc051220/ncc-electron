export const NAV_ITEMS = [
  {
    label: "Hệ thống",
    children: [
      {
        label: "Quản lý người dùng",
        href: "/users",
      },
      {
        label: "Phân nhóm quyền người dùng",
        href: "/user-roles",
      },
      {
        label: "Thay đổi mật khẩu",
        href: "/change-password",
      },
      {
        label: "Xem Seri máy",
        href: "/machine-serials",
      },
    ],
  },
  {
    label: "Quản lý danh sách",
    children: [
      {
        label: "Danh sách phim",
        href: "/films",
      },
      {
        label: "Danh sách hãng phim",
        href: "/manufacturers",
      },
      {
        label: "Quản lý phân chia doanh thu",
        href: "/revenue-sharing",
      },
      {
        label: "Danh sách loại ghế, vị trí",
        href: "/seat-types",
      },
      {
        label: "Danh sách phòng chiếu",
        href: "/screening-rooms",
      },
      {
        label: "Danh sách ngày lễ",
        href: "/holidays",
      },
      {
        label: "Danh sách khung giờ chiếu",
        href: "/showtime-slots",
      },
      {
        label: "Danh sách lý do hủy vé",
        href: "/cancellation-reasons",
      },
      {
        label: "Danh sách giá vé",
        href: "/ticket-prices",
      },
    ],
  },
  {
    label: "Kế hoạch chiếu phim",
    children: [
      {
        label: "Lập kế hoạch chiếu phim",
        href: "/film-scheduling",
      },
      {
        label: "Xem lịch chiếu phim",
        href: "/showtime-schedule",
      },
      {
        label: "Thiết lập bán online theo ghế",
        href: "/online-seat-booking",
      },
      {
        label: "Thiết lập bán online theo ca chiếu",
        href: "/online-showtime-booking",
      },
      {
        label: "Thiết lập giảm giá",
        href: "/discount-settings",
      },
    ],
  },
  {
    label: "Bán vé",
    children: [
      {
        label: "Bán vé khách lẻ",
        href: "/showtimes",
      },
      {
        label: "In vé online",
        href: "/print-online-tickets",
      },
      {
        label: "Tìm vé online",
        href: "/find-online-tickets",
      },
      {
        label: "Quản lý vé hủy",
        href: "/cancellation-tickets",
      },
      {
        label: "Hoàn tiền",
        href: "/refunds",
      },
      {
        label: "Quản lý giấy mời",
        href: "/invitation-tickets",
      },
      {
        label: "Bán vé hợp đồng",
        href: "/contract-ticket-sales",
      },
      {
        label: "Thông kê doanh thu bán vé",
        href: "/ticket-sales-revenue",
      },
    ],
  },
  {
    label: "Tra cứu",
    children: [
      {
        label: "Lịch sử hoạt động",
        href: "/access-history",
      },
      {
        label: "Lịch sử bán vé",
        href: "/order-history",
      },
    ],
  },
  {
    label: "Thống kê, báo cáo",
    children: [
      {
        label: "Báo cáo vé bán, doanh thu theo nhân viên",
        href: "/staff-revenue-report",
      },
      {
        label: "Báo cáo chi tiết bán vé theo phim",
        href: "/film-sales-detail-report",
      },
      {
        label: "Thống kê buổi chiếu, doanh thu chiếu phim",
        href: "/showtime-revenue-statistics",
      },
      {
        label: "Báo cáo quý, doanh thu, buổi chiếu, khán giả",
        href: "/quarterly-report",
      },
      {
        label: "Báo cáo doanh thu chủ phim",
        href: "/film-owner-revenue-report",
      },
      {
        label: "Báo cáo năm",
        href: "/annual-report",
      },
    ],
  },
];
