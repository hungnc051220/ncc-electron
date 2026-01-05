"use client";

import { OrderStatusBadge } from "@/components/order-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrderDetailProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Check, MoreHorizontal, X } from "lucide-react";
interface ColumnsProps {
  page: number;
}

export const createColumns = ({
  page,
}: ColumnsProps): ColumnDef<OrderDetailProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => (page - 1) * 100 + row.index + 1,
  },
  {
    accessorKey: "barCode",
    header: "Mã đặt vé",
    cell: ({ row }) => row.original.order.barCode,
  },
  {
    accessorKey: "createdOnUtc",
    header: "Thời gian mua",
    cell: ({ row }) =>
      format(row.original.order.createdOnUtc, "HH:mm dd/MM/yyyy"), //row.original.order.createdOnUtc,
  },
  {
    accessorKey: "customerName",
    header: "Tên khách hàng",
    cell: ({ row }) =>
      row.original.order.customerFirstName +
      " " +
      row.original.order.customerLastName,
  },
  {
    accessorKey: "customerPhone",
    header: "Số điện thoại",
    cell: ({ row }) => row.original.order.customerPhone,
  },
  {
    accessorKey: "customerEmail",
    header: "Email",
    cell: ({ row }) => row.original.order.customerEmail,
  },
  {
    accessorKey: "filmName",
    header: "Tên phim",
    cell: ({ row }) => row.original.film?.filmName,
  },
  {
    accessorKey: "projectDate",
    header: "Ngày chiếu",
    cell: ({ row }) =>
      row.original.planScreening?.projectDate
        ? format(row.original.planScreening.projectDate, "dd/MM/yyyy")
        : "",
  },
  {
    accessorKey: "projectTime",
    header: "Giờ chiếu",
    cell: ({ row }) =>
      row.original.planScreening?.projectTime
        ? format(row.original.planScreening.projectTime, "HH:mm")
        : "",
  },
  {
    accessorKey: "numberOfTickets",
    header: "Số vé",
    cell: ({ row }) =>
      row.original.order.items.reduce((a, b) => a + b.quantity, 0),
  },
  {
    accessorKey: "positions",
    header: "Vị trí ghế",
    cell: ({ row }) =>
      row.original.order.items.map((item) => item.listChairValueF1).join(", "),
  },
  {
    accessorKey: "isPrinted",
    header: "Đã in",
    cell: ({ row }) =>
      row.original.order.printedOnUtc ? (
        <Check className="size-4 text-green-500" />
      ) : (
        <X className="size-4 text-red-500" />
      ),
  },
  {
    accessorKey: "orderStatusId",
    header: "Trạng thái đơn",
    cell: ({ row }) => (
      <OrderStatusBadge
        status={row.original.order.orderStatusId}
        type="order"
      />
    ),
  },
  {
    accessorKey: "paymentStatusId",
    header: "Trạng thái thanh toán",
    cell: ({ row }) => (
      <OrderStatusBadge
        status={row.original.order.paymentStatusId}
        type="payment"
      />
    ),
  },
  {
    accessorKey: "actions",
    header: "",
    enableHiding: false,
    cell: ({ row }) => {
      const item = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {}}>Xem chi tiết</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {}}>In vé</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
