"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { PlanScreeningDetailProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { addMinutesToTime } from "./add-scheduling-form";

export const columns: ColumnDef<PlanScreeningDetailProps>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "projectDate",
    header: "Ngày chiếu",
    cell: ({ row }) => {
      const date = new Date(row.original.projectDate);
      return format(date, "dd/MM/yyyy");
    },
  },
  {
    accessorKey: "projectTime",
    header: "Giờ chiếu",
    cell: ({ row }) => {
      return format(row.original.projectTime, "HH:mm");
    },
  },
  {
    accessorKey: "roomName",
    header: "Phòng",
    cell: ({ row }) => row.original.roomInfo?.name,
  },
  {
    accessorKey: "filmName",
    header: "Tên phim",
    cell: ({ row }) => (
      <p className="text-wrap">{row.original.filmInfo?.filmName}</p>
    ),
  },
  {
    accessorKey: "endTime",
    header: "Kết thúc",
    cell: ({ row }) => {
      const time = format(row.original.projectTime, "HH:mm");
      const endTime = addMinutesToTime(time, row.original.filmInfo?.duration ?? 0);
      return endTime;
    },
  },
  {
    accessorKey: "priceOfPosition1",
    header: "Giá vé 1",
  },
  {
    accessorKey: "priceOfPosition2",
    header: "Giá vé 2",
  },
  {
    accessorKey: "priceOfPosition3",
    header: "Giá vé 3",
  },
  {
    accessorKey: "priceOfPosition4",
    header: "Giá vé 4",
  },
];
