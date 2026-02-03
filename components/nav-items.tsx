"use client";

import Link from "next/link";
import type { MenuProps } from "antd";
import { Menu } from "antd";
import { useState } from "react";

type MenuItem = Required<MenuProps>["items"][number];

const items: MenuItem[] = [
  {
    label: "Hệ thống",
    key: "system",
    children: [
      {
        label: <Link href="/users">Quản lý người dùng</Link>,
        key: "users",
      },
      {
        label: <Link href="/user-roles">Phân nhóm quyền người dùng</Link>,
        key: "user-roles",
      },
      {
        label: <Link href="/change-password">Thay đổi mật khẩu</Link>,
        key: "change-password",
      },
      {
        label: <Link href="/machine-serials">Xem Seri máy</Link>,
        key: "machine-serials",
      },
    ],
  },
  {
    label: "Quản lý danh sách",
    key: "management",
    children: [
      {
        label: <Link href="/films">Danh sách phim</Link>,
        key: "films",
      },
      {
        label: <Link href="/manufacturers">Danh sách hãng phim</Link>,
        key: "manufacturers",
      },
      {
        label: <Link href="/revenue-sharing">Quản lý phân chia doanh thu</Link>,
        key: "revenue-sharing",
      },
      {
        label: <Link href="/seat-types">Danh sách loại ghế, vị trí</Link>,
        key: "seat-types",
      },
      {
        label: <Link href="/screening-rooms">Danh sách phòng chiếu</Link>,
        key: "screening-rooms",
      },
      {
        label: <Link href="/holidays">Danh sách ngày lễ</Link>,
        key: "holidays",
      },
      {
        label: <Link href="/showtime-slots">Danh sách khung giờ chiếu</Link>,
        key: "showtime-slots",
      },
      {
        label: <Link href="/cancellation-reasons">Danh sách lý do hủy vé</Link>,
        key: "cancellation-reasons",
      },
      {
        label: <Link href="/ticket-prices">Danh sách giá vé</Link>,
        key: "ticket-prices",
      },
    ],
  },
  {
    label: "Kế hoạch chiếu phim",
    key: "planning",
    children: [
      {
        label: <Link href="/plan-cinema">Lập kế hoạch chiếu phim</Link>,
        key: "plan-cinema",
      },
      {
        label: <Link href="/showtime-schedule">Xem lịch chiếu phim</Link>,
        key: "showtime-schedule",
      },
      {
        label: (
          <Link href="/online-seat-booking">Thiết lập bán online theo ghế</Link>
        ),
        key: "online-seat-booking",
      },
      {
        label: (
          <Link href="/online-showtime-booking">
            Thiết lập bán online theo ca chiếu
          </Link>
        ),
        key: "online-showtime-booking",
      },
      {
        label: <Link href="/discount-settings">Thiết lập giảm giá</Link>,
        key: "discount-settings",
      },
    ],
  },
  {
    label: "Bán vé",
    key: "ticket-sales",
    children: [
      {
        label: <Link href="/showtimes">Bán vé khách lẻ</Link>,
        key: "showtimes",
      },
      {
        label: <Link href="/print-online-tickets">In vé online</Link>,
        key: "print-online-tickets",
      },
      {
        label: <Link href="/find-online-tickets">Tìm vé online</Link>,
        key: "find-online-tickets",
      },
      {
        label: <Link href="/cancellation-tickets">Quản lý vé hủy</Link>,
        key: "cancellation-tickets",
      },
      {
        label: <Link href="/refunds">Hoàn tiền</Link>,
        key: "refunds",
      },
      {
        label: <Link href="/invitation-tickets">Quản lý giấy mời</Link>,
        key: "invitation-tickets",
      },
      {
        label: <Link href="/contract-ticket-sales">Bán vé hợp đồng</Link>,
        key: "contract-ticket-sales",
      },
      {
        label: (
          <Link href="/ticket-sales-revenue">Thông kê doanh thu bán vé</Link>
        ),
        key: "ticket-sales-revenue",
      },
    ],
  },
  {
    label: "Tra cứu",
    key: "lookup",
    children: [
      {
        label: <Link href="/access-history">Lịch sử hoạt động</Link>,
        key: "access-history",
      },
      {
        label: <Link href="/order-history">Lịch sử bán vé</Link>,
        key: "order-history",
      },
    ],
  },
  {
    label: "Thống kê, báo cáo",
    key: "reports",
    children: [
      {
        label: (
          <Link href="/staff-revenue-report">
            Báo cáo vé bán, doanh thu theo nhân viên
          </Link>
        ),
        key: "staff-revenue-report",
      },
      {
        label: (
          <Link href="/film-sales-detail-report">
            Báo cáo chi tiết bán vé theo phim
          </Link>
        ),
        key: "film-sales-detail-report",
      },
      {
        label: (
          <Link href="/film-owner-revenue-report">
            Báo cáo doanh thu chủ phim
          </Link>
        ),
        key: "film-owner-revenue-report",
      },
      {
        label: (
          <Link href="/monthly-report">
            Báo cáo tháng
          </Link>
        ),
        key: "monthly-report",
      },
      {
        label: (
          <Link href="/quarterly-report">
            Báo cáo quý
          </Link>
        ),
        key: "quarterly-report",
      },

      {
        label: <Link href="/annual-report">Báo cáo năm</Link>,
        key: "annual-report",
      },
    ],
  },
];

const NavItems = () => {
  const [current, setCurrent] = useState("");

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
      style={{ minWidth: 0, flex: "auto", justifyContent: "center" }}
    />
  );
};

export default NavItems;
