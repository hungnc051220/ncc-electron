"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ManufacturerProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

interface ColumnsProps {
  onEdit: (item: ManufacturerProps) => void;
  onDelete: (item: ManufacturerProps) => void;
  page: number;
}

export const createColumns = ({
  onEdit,
  onDelete,
  page,
}: ColumnsProps): ColumnDef<ManufacturerProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => (page - 1) * 10 + row.index + 1,
  },
  {
    accessorKey: "name",
    header: "Hãng phim phát hành",
  },
  {
    accessorKey: "fullName",
    header: "Tên công ty",
  },
  {
    accessorKey: "address",
    header: "Địa chỉ công ty",
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
