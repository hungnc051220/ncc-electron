"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DayPartProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

interface ColumnsProps {
  onEdit: (item: DayPartProps) => void;
  onDelete: (item: DayPartProps) => void;
  page: number;
}

export const createColumns = ({
  onEdit,
  onDelete,
  page,
}: ColumnsProps): ColumnDef<DayPartProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => (page - 1) * 10 + row.index + 1,
  },
  {
    accessorKey: "name",
    header: "Tên khung giờ",
  },
  {
    accessorKey: "dateTypeId",
    header: "Loại ngày",
    cell: ({ row }) => {
      const dateTypeId = row.original.dateTypeId;
      return dateTypeId === 1 ? "Ngày thường" : "Ngày lễ";
    },
  },
  {
    accessorKey: "fromTime",
    header: "Thời gian bắt đầu",
  },
  {
    accessorKey: "toTime",
    header: "Thời gian kết thúc",
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
