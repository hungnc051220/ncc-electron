"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DayPartProps, SeatTypeProps, TicketPriceProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

interface ColumnsProps {
  onEdit: (item: TicketPriceProps) => void;
  onDelete: (item: TicketPriceProps) => void;
  page: number;
  positions: SeatTypeProps[];
  dayParts: DayPartProps[];
}

export const createColumns = ({
  onEdit,
  onDelete,
  page,
  positions,
  dayParts,
}: ColumnsProps): ColumnDef<TicketPriceProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => (page - 1) * 10 + row.index + 1,
  },
  {
    accessorKey: "versionCode",
    header: "Mã phiên bản",
  },
  {
    accessorKey: "daypartId",
    header: "Ca chiếu",
    cell: ({ row }) => {
      const daypartId = row.original.daypartId;
      return dayParts?.find((x) => x.id === daypartId)?.name || "";
    },
  },
  {
    accessorKey: "positionId",
    header: "Loại ghế",
    cell: ({ row }) => {
      const positionId = row.original.positionId;
      return positions?.find((x) => x.id === positionId)?.name || "";
    },
  },
  {
    accessorKey: "price",
    header: "Giá vé",
    cell: ({ row }) => {
      const price = row.original.price;
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
