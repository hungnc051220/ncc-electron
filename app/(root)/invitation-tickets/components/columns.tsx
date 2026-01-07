"use client";

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
  onViewDetail: (item: OrderDetailProps) => void;
  onDelete: (item: OrderDetailProps) => void;
  onPrint: (item: OrderDetailProps) => void;
  page: number;
}

export const createColumns = ({
  onViewDetail,
  onDelete,
  onPrint,
  page,
}: ColumnsProps): ColumnDef<OrderDetailProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => (page - 1) * 10 + row.index + 1,
  },
  {
    accessorKey: "barCode",
    header: "Mã vé",
    cell: ({ row }) => row.original.order.barCode,
  },
  {
    accessorKey: "filmName",
    header: "Tên phim",
    cell: ({ row }) => row.original.film?.filmName,
  },
  {
    accessorKey: "roomName",
    header: "Phòng chiếu",
    cell: ({ row }) => row.original.room?.name,
  },
  {
    accessorKey: "projectTime",
    header: "Giờ chiếu",
    cell: ({ row }) =>
      row.original.planScreening?.projectTime
        ? format(row.original.planScreening?.projectTime, "HH:mm")
        : "",
  },
  {
    accessorKey: "projectDate",
    header: "Ngày chiếu",
    cell: ({ row }) =>
      row.original.planScreening?.projectDate
        ? format(row.original.planScreening?.projectDate, "dd/MM/yyyy")
        : "",
  },
  {
    accessorKey: "ticketCount",
    header: "Số vé",
    cell: ({ row }) => {
      const tickets = row.original.order?.items || [];
      const totalQuantity = tickets.reduce((acc, cur) => acc + cur.quantity, 0);
      return totalQuantity;
    },
  },
  {
    accessorKey: "seats",
    header: "Mã ghế",
    cell: ({ row }) => {
      const chairsF1 = row.original.order?.items?.map(
        (item) => item.listChairValueF1
      );
      const chairsF2 = row.original.order?.items?.map(
        (item) => item.listChairValueF2
      );
      const chairsF3 = row.original.order?.items?.map(
        (item) => item.listChairValueF3
      );
      const allChairs = [...chairsF1, ...chairsF2, ...chairsF3].filter(Boolean);
      return allChairs.join(", ");
    },
  },
  {
    accessorKey: "createdBy",
    header: "Người tạo",
    cell: ({ row }) => "",
  },
  {
    accessorKey: "receiver",
    header: "Người nhận",
    cell: ({ row }) => "",
  },
  {
    accessorKey: "createdAt",
    header: "Ngày tạo",
    cell: ({ row }) =>
      row.original.order?.createdOnUtc
        ? format(row.original.order?.createdOnUtc, "dd/MM/yyyy")
        : "",
  },
  {
    accessorKey: "isPrinted",
    header: "Xuất vé mời",
    cell: ({ row }) =>
      row.original.order?.printedOnUtc ? (
        <Check className="size-4 text-green-500" />
      ) : (
        <X className="size-4 text-red-500" />
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
            <DropdownMenuItem onClick={() => onPrint(item)}>
              Xuất vé mời
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(item)}
              className="text-destructive"
            >
              Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
