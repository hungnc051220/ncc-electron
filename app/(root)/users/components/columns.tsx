"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

interface ColumnsProps {
  onEdit: (user: UserProps) => void;
  onDelete: (user: UserProps) => void;
  page: number;
}

export const createColumns = ({
  onEdit,
  onDelete,
  page,
}: ColumnsProps): ColumnDef<UserProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => (page - 1) * 10 + row.index + 1,
  },
  {
    accessorKey: "id",
    header: "Mã người dùng",
  },
  {
    accessorKey: "username",
    header: "Tên đăng nhập",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "manufacturerId",
    header: "Mã nhà sản xuất",
  },
  {
    accessorKey: "actions",
    header: "",
    enableHiding: false,
    cell: ({ row }) => {
      const user = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(user)}>
              Cập nhật
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(user)}
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
