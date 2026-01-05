"use client";

import { Switch } from "@/components/ui/switch";
import { PlanScreeningDetailProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

interface ColumnsProps {
  onChangeSellOnline: (item: PlanScreeningDetailProps) => void;
  page: number;
}

export const createColumns = ({
  onChangeSellOnline,
  page,
}: ColumnsProps): ColumnDef<PlanScreeningDetailProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => (page - 1) * 10 + row.index + 1,
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
      const date = new Date(row.original.projectTime);
      return format(date, "HH:mm");
    },
  },
  {
    accessorKey: "filmName",
    header: "Tên phim",
    cell: ({ row }) => row.original.filmInfo?.filmName,
  },
  {
    accessorKey: "roomName",
    header: "Phòng chiếu",
    cell: ({ row }) => row.original.roomInfo.name,
  },
  {
    accessorKey: "isOnlineSelling",
    header: "Trạng thái bán online",
    cell: ({ row }) => (
      <div className="flex items-center space-x-2">
        <Switch
          checked={row.original.isOnlineSelling === 1 ? true : false}
          onCheckedChange={() => onChangeSellOnline(row.original)}
        />
      </div>
    ),
  },
];
