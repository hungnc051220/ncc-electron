"use client";

import { AuditLogProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

interface ColumnsProps {
  page: number;
}

export const createColumns = ({
  page,
}: ColumnsProps): ColumnDef<AuditLogProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => (page - 1) * 10 + row.index + 1,
  },
  {
    accessorKey: "entityId",
    header: "Id",
  },
  {
    accessorKey: "model",
    header: "Tên trường",
  },
  {
    accessorKey: "action",
    header: "Thao tác",
    cell: ({ row }) => {
      const action = row.original.action;
      const actionMap: Record<string, string> = {
        CREATE: "Tạo",
        UPDATE: "Cập nhật",
        DELETE: "Xóa",
      };
      return actionMap[action] || action;
    },
  },
  {
    accessorKey: "oldValues",
    header: "Giá trị cũ",
    cell: ({ row }) => {
      const oldValues = row.original.oldValues;
      return <div className="max-w-[500px] whitespace-normal wrap-break-word">{oldValues}</div>;
    },
  },
  {
    accessorKey: "newValues",
    header: "Giá trị mới",
    cell: ({ row }) => {
      const newValues = row.original.newValues;
      return <div className="max-w-[500px] whitespace-normal wrap-break-word">{newValues}</div>;
    },
  },
  {
    accessorKey: "timestamp",
    header: "Ngày thực hiện",
    cell: ({ row }) => format(new Date(row.original.timestamp), "dd/MM/yyyy HH:mm:ss"),
  },
  {
    accessorKey: "userId",
    header: "Người thực hiện",
  },
];
