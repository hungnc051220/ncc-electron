"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HolidayProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { MoreHorizontal } from "lucide-react";

interface ColumnsProps {
  onDelete: (item: HolidayProps) => void;
  page: number;
}

export const createColumns = ({
  onDelete,
  page,
}: ColumnsProps): ColumnDef<HolidayProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => (page - 1) * 100 + row.index + 1,
  },
  {
    accessorKey: "dateValue",
    header: "Ngày",
    cell: ({ row }) => {
      const dateValue = row.original.dateValue;
      return format(dateValue, "dd/MM/yyyy");
    },
  },
  {
    accessorKey: "dateName",
    header: "Thứ",
    cell: ({ row }) => {
      const dateValue = row.original.dateValue;
      return format(dateValue, "EEEE", { locale: vi });
    },
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
