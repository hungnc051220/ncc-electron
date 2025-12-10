"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoomProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

interface ColumnsProps {
  onEdit: (item: RoomProps) => void;
  onDelete: (item: RoomProps) => void;
  page: number;
}

export const createColumns = ({
  onEdit,
  onDelete,
  page,
}: ColumnsProps): ColumnDef<RoomProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => (page - 1) * 10 + row.index + 1,
  },
  {
    accessorKey: "name",
    header: "Phòng chiếu",
  },
  {
    accessorKey: "numberOfFloor",
    header: "Số tầng",
  },
  {
    accessorKey: "wideSizeF1",
    header: "Số hàng Tầng 1",
  },
  {
    accessorKey: "deepSizeF1",
    header: "Số ghế Tầng 1",
  },
  {
    accessorKey: "wideSizeF2",
    header: "Số hàng Tầng 2",
  },
  {
    accessorKey: "deepSizeF2",
    header: "Số ghế Tầng 2",
  },
  {
    accessorKey: "wideSizeF3",
    header: "Số hàng Tầng 3",
  },
  {
    accessorKey: "deepSizeF3",
    header: "Số ghế Tầng 3",
  },
  {
    accessorKey: "ruleOrder",
    header: "Quy luật xếp ghế",
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
