"use client";

import { OrderStatusBadge } from "@/components/order-status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMoney } from "@/lib/utils";
import { OrderDetailProps } from "@/types";
import { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";
interface ColumnsProps {
  page: number;
  onViewDetail: (item: OrderDetailProps) => void;
  options: {
    isRowPreselected?: (item: OrderDetailProps) => boolean;
  };
}

export const createColumns = ({
  page,
  onViewDetail,
  options = {},
}: ColumnsProps): ColumnDef<OrderDetailProps>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={(() => {
          const selectableRows = table.getRowModel().rows;
          if (selectableRows.length === 0) return false;
          const allChecked = selectableRows.every(
            (row) =>
              options.isRowPreselected?.(row.original) || row.getIsSelected()
          );
          if (allChecked) return true;
          const someChecked = selectableRows.some(
            (row) =>
              options.isRowPreselected?.(row.original) || row.getIsSelected()
          );
          return someChecked ? "indeterminate" : false;
        })()}
        onCheckedChange={(value) => {
          const shouldSelect = !!value;
          const nextSelection: RowSelectionState = {};
          table.getRowModel().rows.forEach((row) => {
            if (shouldSelect) {
              nextSelection[row.id] = true;
            }
          });
          table.setRowSelection(nextSelection);
        }}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={
          options.isRowPreselected?.(row.original) || row.getIsSelected()
        }
        onCheckedChange={(value) => {
          row.toggleSelected(!!value);
        }}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => (page - 1) * 100 + row.index + 1,
  },
  {
    accessorKey: "id",
    header: "Mã đơn",
    cell: ({ row }) => row.original.order.id,
  },
  {
    accessorKey: "barCode",
    header: "Mã đặt vé",
    cell: ({ row }) => row.original.order.barCode,
  },
  {
    accessorKey: "orderTotal",
    header: "Tiền thanh toán",
    cell: ({ row }) => formatMoney(row.original.order.orderTotal || 0),
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
            <DropdownMenuItem onClick={() => onViewDetail(item)}>
              Xem chi tiết
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
