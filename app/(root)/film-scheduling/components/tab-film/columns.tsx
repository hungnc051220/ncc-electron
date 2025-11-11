"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { PlanFilmProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";

export const columns: ColumnDef<PlanFilmProps>[] = [
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
    accessorKey: "filmName",
    header: "Tên phim",
    cell: ({ row }) => row.original.film.filmName,
  },
  {
    accessorKey: "duration",
    header: "Thời lượng",
    cell: ({ row }) => `${row.original.film.duration} phút`,
  },
  {
    accessorKey: "versionCode",
    header: "Version code",
    cell: ({ row }) => row.original.film.versionCode,
  },
];
