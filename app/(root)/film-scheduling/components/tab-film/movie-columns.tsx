"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { formatMoney } from "@/lib/utils";
import { FilmProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";

export const columns: ColumnDef<FilmProps>[] = [
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
    cell: ({ row }) => <p className="text-wrap">{row.original.filmName}</p>,
  },
  {
    accessorKey: "duration",
    header: "Thời lượng",
    cell: ({ row }) => `${row.original.duration} phút`,
  },
  {
    accessorKey: "proposedPrice",
    header: "Giá cộng thêm",
    cell: ({ row }) => formatMoney(row.original.proposedPrice),
  },
  {
    accessorKey: "versionCode",
    header: "Version code",
    cell: ({ row }) => row.original.versionCode,
  },
];
