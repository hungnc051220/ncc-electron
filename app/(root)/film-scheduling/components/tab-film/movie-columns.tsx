"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { formatMoney } from "@/lib/utils";
import { FilmProps } from "@/types";
import { ColumnDef, RowSelectionState } from "@tanstack/react-table";

type MovieColumnOptions = {
  isRowDisabled?: (film: FilmProps) => boolean;
  isRowPreselected?: (film: FilmProps) => boolean;
};

export const getMovieColumns = (
  options: MovieColumnOptions = {}
): ColumnDef<FilmProps>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={(() => {
          const selectableRows = table
            .getRowModel()
            .rows.filter((row) => !options.isRowDisabled?.(row.original));
          if (selectableRows.length === 0) return false;
          const allChecked = selectableRows.every(
            (row) =>
              options.isRowPreselected?.(row.original) || row.getIsSelected()
          );
          if (allChecked) return true;
          const someChecked = selectableRows.some(
            (row) =>
              options.isRowPreselected?.(row.original) || row.getIsSelected()
          );
          return someChecked ? "indeterminate" : false;
        })()}
        onCheckedChange={(value) => {
          const shouldSelect = !!value;
          const nextSelection: RowSelectionState = {};
          table
            .getRowModel()
            .rows.filter(
              (row) =>
                !options.isRowDisabled?.(row.original) &&
                !options.isRowPreselected?.(row.original)
            )
            .forEach((row) => {
              if (shouldSelect) {
                nextSelection[row.id] = true;
              }
            });
          table.setRowSelection(nextSelection);
        }}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={
          options.isRowPreselected?.(row.original) || row.getIsSelected()
        }
        disabled={options.isRowDisabled?.(row.original)}
        onCheckedChange={(value) => {
          const isDisabled =
            options.isRowDisabled?.(row.original) ||
            options.isRowPreselected?.(row.original);
          if (isDisabled) return;
          row.toggleSelected(!!value);
        }}
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
