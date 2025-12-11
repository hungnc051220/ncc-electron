"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SeatTypeProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { Check, MoreHorizontal, X } from "lucide-react";
import Image from "next/image";

interface ColumnsProps {
  onEdit: (item: SeatTypeProps) => void;
  onDelete: (item: SeatTypeProps) => void;
  page: number;
}

export const createColumns = ({
  onEdit,
  onDelete,
  page,
}: ColumnsProps): ColumnDef<SeatTypeProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => (page - 1) * 10 + row.index + 1,
  },
  {
    accessorKey: "positionCode",
    header: "Mã",
  },
  {
    accessorKey: "name",
    header: "Loại ghế, vị trí",
  },
  {
    accessorKey: "isSeat",
    header: "Là ghế ngồi",
    cell: ({ row }) =>
      row.original.isSeat ? (
        <Check className="size-4 text-green-500" />
      ) : (
        <X className="size-4 text-red-500" />
      ),
  },
  {
    accessorKey: "isDefault",
    header: "Mặc định",
    cell: ({ row }) =>
      row.original.isDefault ? (
        <Check className="size-4 text-green-500" />
      ) : (
        <X className="size-4 text-red-500" />
      ),
  },
  {
    accessorKey: "color",
    header: "Màu sắc",
    cell: ({ row }) => (
      <div
        className="w-15 h-9 rounded-md border"
        style={{ background: row.original.color }}
      />
    ),
  },
  {
    accessorKey: "pictureUrl",
    header: "Ảnh",
    cell: ({ row }) =>
      row.original.pictureUrl ? (
        <Image src={row.original.pictureUrl} alt="picture" width={50} height={50} className="rounded-md object-cover object-center w-15 h-9"/>
      ) : null,
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
