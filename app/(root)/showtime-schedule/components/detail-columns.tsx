"use client";

import { PlanScreeningDetailProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export const createColumns = (): ColumnDef<PlanScreeningDetailProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "createdOnUtc",
    header: "Ngày chiếu",
    cell: ({ row }) => {
      const date = new Date(row.original.createdOnUtc);
      return format(date, "dd/MM/yyyy");
    },
  },
  {
    accessorKey: "createdOnUtc",
    header: "Giờ chiếu",
    cell: ({ row }) => {
      const date = new Date(row.original.createdOnUtc);
      return format(date, "HH:mm");
    },
  },
  {
    accessorKey: "roomName",
    header: "Phòng",
    cell: ({ row }) => row.original.roomInfo.name,
  },
  {
    accessorKey: "filmName",
    header: "Tên phim",
    cell: ({ row }) => row.original.filmInfo.filmName,
  },
  {
    accessorKey: "duration",
    header: "Thời lượng",
    cell: ({ row }) => `${row.original.filmInfo.duration} phút`,
  },
];
