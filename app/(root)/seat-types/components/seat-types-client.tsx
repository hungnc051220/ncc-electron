"use client";

import { DataTable } from "@/components/data-table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ApiResponse, SeatTypeProps } from "@/types";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useMediaQuery } from "react-responsive";
import SeatTypesDialog from "./seat-type-dialog";
import { createColumns } from "./columns";
import DeleteSeatTypeDialog from "./delete-seat-type-dialog";

interface SeatTypesClientProps {
  data: ApiResponse<SeatTypeProps>;
  page: number;
}

const SeatTypesClient = ({ data, page }: SeatTypesClientProps) => {
  const isTabletOrMobile = useMediaQuery({ query: "(max-width: 1024px)" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(true);
  const [editingSeatType, setEditingSeatType] = useState<SeatTypeProps | null>(
    null
  );
  const [deletingSeatType, setDeletingSeatType] =
    useState<SeatTypeProps | null>(null);

  const handleAdd = useCallback(() => {
    setEditingSeatType(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: SeatTypeProps) => {
    setEditingSeatType(item);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((item: SeatTypeProps) => {
    setDeletingSeatType(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingSeatType(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setDeletingSeatType(null);
    }
  }, []);

  const columns = useMemo(
    () => createColumns({ onEdit: handleEdit, onDelete: handleDelete, page }),
    [handleEdit, handleDelete, page]
  );

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Quản lý danh sách</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-bold">
                  Danh sách loại ghế, vị trí
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex gap-2 items-center">
          <Button
            onClick={handleAdd}
            size={isTabletOrMobile ? "sm" : "default"}
          >
            <PlusIcon className={isTabletOrMobile ? "size-3" : "size-4"} />
            Thêm mới
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data.data}
        total={data.total}
        className="max-h-[calc(100vh-200px)]"
      />
      {dialogOpen && (
        <SeatTypesDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingSeatType={editingSeatType}
        />
      )}
      {deletingSeatType && (
        <DeleteSeatTypeDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={deletingSeatType.id}
          name={deletingSeatType.name}
        />
      )}
    </div>
  );
};

export default SeatTypesClient;
