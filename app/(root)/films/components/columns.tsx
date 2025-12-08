"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMoney } from "@/lib/utils";
import { FilmProps, ManufacturerProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Check, MoreHorizontal, X } from "lucide-react";

interface ColumnsProps {
  onEdit: (user: FilmProps) => void;
  onDelete: (user: FilmProps) => void;
  page: number;
  manufactures: ManufacturerProps[];
}

export const createColumns = ({
  onEdit,
  onDelete,
  page,
  manufactures,
}: ColumnsProps): ColumnDef<FilmProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => <p className="w-[30px] text-center">{(page - 1) * 100 + row.index + 1}</p>,
  },
  {
    accessorKey: "filmName",
    header: "Tên phim",
    cell: ({ row }) => (
      <p className="whitespace-nowrap font-bold text-hit">
        {row.original.filmName}
      </p>
    ),
  },
  {
    accessorKey: "versionCode",
    header: "Phiên bản",
  },
  {
    accessorKey: "manufacturerId",
    header: "Hãng phát hành",
    cell: ({ row }) =>
      manufactures.find(
        (manufacturer) => manufacturer.id === row.original.manufacturerId
      )?.name,
  },
  {
    accessorKey: "premieredDay",
    header: "Ngày khởi chiếu",
    cell: ({ row }) => format(row.original.premieredDay, "dd/MM/yyyy"),
  },
  {
    accessorKey: "duration",
    header: "Thời lượng",
    cell: ({ row }) => `${row.original.duration} phút`,
  },
  {
    accessorKey: "countryName",
    header: "Nước sản xuất",
  },
  {
    accessorKey: "proposedPrice",
    header: "Giá cộng thêm",
    cell: ({ row }) => formatMoney(row.original.proposedPrice || 0),
  },
  {
    accessorKey: "sellOnline",
    header: "Bán online",
    cell: ({ row }) =>
      row.original.sellOnline ? (
        <Check className="size-4 text-green-500" />
      ) : (
        <X className="size-4 text-red-500" />
      ),
  },
  {
    accessorKey: "actions",
    header: "",
    enableHiding: false,
    cell: ({ row }) => {
      const film = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(film)}>
              Cập nhật
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(film)}
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
