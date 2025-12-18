"use client";

import { UserProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";

interface ColumnsProps {
  page: number;
}

export const createColumns = ({
  page,
}: ColumnsProps): ColumnDef<UserProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => (page - 1) * 10 + row.index + 1,
  },
  {
    accessorKey: "id",
    header: "Dữ liệu",
  },
  {
    accessorKey: "username",
    header: "Người tạo",
  },
  {
    accessorKey: "email",
    header: "Ngày tạo",
  },
  {
    accessorKey: "email",
    header: "Người cập nhật",
  },
  {
    accessorKey: "createdOnUtc",
    header: "Ngày cập nhật",
  },
];
