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
    accessorKey: "year",
    header: "Năm",
  },
  {
    accessorKey: "code",
    header: "Ký hiệu",
  },
  {
    accessorKey: "name",
    header: "Tên máy",
  },
  {
    accessorKey: "manufacturerId",
    header: "Vé đã in",
  },
  {
    accessorKey: "cancelTicket",
    header: "Hủy vé",
  },
];
