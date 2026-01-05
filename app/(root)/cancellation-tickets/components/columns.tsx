"use client";

import { CancellationTicketProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

interface ColumnsProps {
  page: number;
}

export const createColumns = ({
  page,
}: ColumnsProps): ColumnDef<CancellationTicketProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => (page - 1) * 100 + row.index + 1,
  },
  {
    accessorKey: "createdOnUtc",
    header: "Ngày hủy",
    cell: ({ row }) => format(row.original.createdOnUtc, "HH:mm dd/MM/yyyy"), //row.original.order.createdOnUtc,
  },
  {
    accessorKey: "filmName",
    header: "Tên phim",
  },
  {
    accessorKey: "roomName",
    header: "Phòng chiếu",
  },
  {
    accessorKey: "projectDate",
    header: "Ngày chiếu",
    cell: ({ row }) =>
      row.original.projectDate
        ? format(row.original.projectDate, "dd/MM/yyyy")
        : "",
  },
  {
    accessorKey: "projectTime",
    header: "Giờ chiếu",
    cell: ({ row }) =>
      row.original?.projectTime
        ? format(row.original.projectTime, "HH:mm")
        : "",
  },
  {
    accessorKey: "quantity",
    header: "Số vé",
  },
  {
    accessorKey: "cancelChairValue",
    header: "Vị trí ghế",
    cell: ({ row }) =>
      [
        row.original.cancelChairValueF1,
        row.original.cancelChairValueF2,
        row.original.cancelChairValueF3,
      ]
        .filter((i) => i.trim() !== "")
        .join(", "),
  },
  {
    accessorKey: "userName",
    header: "Người hủy",
  },
  {
    accessorKey: "reason",
    header: "Lý do hủy",
  },
];
