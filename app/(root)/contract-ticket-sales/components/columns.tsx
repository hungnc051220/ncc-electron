"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContractTicketSaleProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

interface ColumnsProps {
  onEdit: (item: ContractTicketSaleProps) => void;
  onDelete: (item: ContractTicketSaleProps) => void;
  onUpdateSeat: (item: ContractTicketSaleProps) => void;
  onPrint: (item: ContractTicketSaleProps) => void;
  page: number;
}

export const createColumns = ({
  onEdit,
  onDelete,
  onUpdateSeat,
  onPrint,
  page,
}: ColumnsProps): ColumnDef<ContractTicketSaleProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => (page - 1) * 10 + row.index + 1,
  },
  {
    accessorKey: "customerFirstName",
    header: "Tên khách hàng",
  },
  {
    accessorKey: "daypartId",
    header: "Tên phim",
  },
  {
    accessorKey: "positionId",
    header: "Phòng chiếu",
  },
  {
    accessorKey: "positionId",
    header: "Giờ chiếu",
  },
  {
    accessorKey: "positionId",
    header: "Ngày chiếu",
  },
  {
    accessorKey: "ticketCount",
    header: "Số vé",
  },
  {
    accessorKey: "orderTotal",
    header: "Giá trị hợp đồng",
    cell: ({ row }) => {
      const price = row.original.orderTotal;
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(price);
    },
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
            <DropdownMenuItem onClick={() => onEdit(item)}>
              Cập nhật
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateSeat(item)}>
              Thiết lập ghế ngồi
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPrint(item)}>
              In vé
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
