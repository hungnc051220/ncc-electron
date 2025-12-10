"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMoney } from "@/lib/utils";
import { DiscountProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

interface ColumnsProps {
  onEdit: (item: DiscountProps) => void;
  onDelete: (item: DiscountProps) => void;
  page: number;
}

export const createColumns = ({
  onEdit,
  onDelete,
  page,
}: ColumnsProps): ColumnDef<DiscountProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => (page - 1) * 10 + row.index + 1,
  },
  {
    accessorKey: "discountName",
    header: "Khuyến mại, giảm giá",
  },
  {
    accessorKey: "discountType",
    header: "Hình thức",
  },
  {
    accessorKey: "discountAmount",
    header: "Số tiền",
    cell: ({ row }) =>
      row.original.discountAmount
        ? formatMoney(row.original.discountAmount)
        : "",
  },
  {
    accessorKey: "discountRate",
    header: "Tỷ lệ (%)",
    cell: ({ row }) =>
      row.original.discountRate
        ? `${row.original.discountRate}%`
        : "",
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
