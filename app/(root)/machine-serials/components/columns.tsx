"use client";

import { formatNumber } from "@/lib/utils";
import { MachineSerialProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";

interface ColumnsProps {
  page: number;
}

export const createColumns = ({
  page,
}: ColumnsProps): ColumnDef<MachineSerialProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => (page - 1) * 100 + row.index + 1,
  },
  {
    accessorKey: "activeYear",
    header: "Năm",
  },
  {
    accessorKey: "shortName",
    header: "Ký hiệu",
  },
  {
    accessorKey: "posName",
    header: "Tên máy",
  },
  {
    accessorKey: "printTimes",
    header: "Vé đã in",
    cell: ({ row }) => formatNumber(row.original.printTimes),
  },
  {
    accessorKey: "cancelTimes",
    header: "Hủy vé",
    cell: ({ row }) => formatNumber(row.original.cancelTimes),
  },
];
