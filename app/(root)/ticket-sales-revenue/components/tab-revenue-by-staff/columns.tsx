"use client";

import { AuditLogProps } from "@/types";
import { ColumnDef } from "@tanstack/react-table";

export const createColumns = (): ColumnDef<AuditLogProps>[] => [
  {
    accessorKey: "no",
    header: "STT",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "userName",
    header: "Tên nhân viên",
  },
  {
    accessorKey: "onQuantity",
    header: "Online",
  },
  {
    accessorKey: "offQuantity",
    header: "Offline",
  },
  {
    accessorKey: "totalQuantity",
    header: "Tổng vé",
  },
  {
    accessorKey: "offSaleVietQr",
    header: "Doanh thu VietQR",
  },
  {
    accessorKey: "offSaleVnPayQr",
    header: "Doanh thu VNPayQR",
  },
  {
    accessorKey: "actualOffSale",
    header: "Doanh thu Offline",
  },
  {
    accessorKey: "totalSale",
    header: "Tiền thực nộp",
  },
];
