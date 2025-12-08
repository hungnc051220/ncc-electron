"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  total: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading,
  total,
}: DataTableProps<TData, TValue>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedPage, setSelectedPage] = useState<number>(
    Math.max(parseInt(searchParams.get("page") || "1", 10), 1)
  );
  const currentPage = Math.max(
    parseInt(searchParams.get("page") || "1", 10),
    1
  );
  const pageSize = Math.max(
    parseInt(searchParams.get("pageSize") || "100", 10),
    1
  );
  const totalPages = Math.max(Math.ceil((total || 0) / pageSize), 1);

  const getFooter = () => {
    if (!data || data.length === 0) return "0";
    const start = (selectedPage - 1) * pageSize + 1;
    const end = Math.min(selectedPage * pageSize, total);
    return `${start} - ${end}/${total}`;
  };

  const buildUrl = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    if (!params.get("pageSize")) params.set("pageSize", String(pageSize));
    return `${window.location.pathname}?${params.toString()}`;
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
  });

  useEffect(() => {
    setSelectedPage(currentPage);
  }, [currentPage]);

  return (
    <div>
      <div className="relative rounded-t-md border max-h-[calc(100vh-260px)] overflow-hidden">
        {(loading || isPending) && (
          <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Đang tải...</span>
            </div>
          </div>
        )}
        <div className="overflow-auto max-h-[calc(100vh-260px)]">
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 bg-goku z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    Không có kết quả nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>
      <div className="justify-between flex items-center w-full border-t-0 border rounded-b-md px-4 py-1">
        <p className="whitespace-nowrap text-sm text-gray-600">
          Hiển thị <span className="font-bold">{getFooter()}</span>
        </p>
        <Pagination className="justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                className={
                  currentPage === 1 ? "pointer-events-none opacity-50" : ""
                }
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) {
                    const next = currentPage - 1;
                    setSelectedPage(next);
                    startTransition(() => router.push(buildUrl(next)));
                  }
                }}
              />
            </PaginationItem>

            {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
              let pageStart = Math.max(1, currentPage - 2);
              const pageEnd = Math.min(totalPages, pageStart + 4);
              pageStart = Math.max(1, pageEnd - 4);
              const pageNum = pageStart + idx;
              if (pageNum > totalPages) return null;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href="#"
                    isActive={pageNum === selectedPage}
                    onClick={(e) => {
                      e.preventDefault();
                      if (pageNum !== currentPage) {
                        setSelectedPage(pageNum);
                        startTransition(() => router.push(buildUrl(pageNum)));
                      }
                    }}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            {totalPages > 5 && currentPage + 2 < totalPages && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) {
                    const next = currentPage + 1;
                    setSelectedPage(next);
                    startTransition(() => router.push(buildUrl(next)));
                  }
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
