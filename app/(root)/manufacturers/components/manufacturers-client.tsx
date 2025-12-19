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
import { ApiResponse, ManufacturerProps } from "@/types";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { createColumns } from "./columns";
import DeleteManufacturerDialog from "./delete-manufacturer-dialog";
import ManufacturerDialog from "./manufacturer-dialog";

interface ManufacturesClientProps {
  data: ApiResponse<ManufacturerProps>;
  page: number;
}

const ManufacturesClient = ({
  data,
  page,
}: ManufacturesClientProps) => {
  const isTabletOrMobile = useMediaQuery({ query: "(max-width: 1024px)" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(true);
  const [editingManufacturer, setEditingManufacturer] = useState<ManufacturerProps | null>(null);
  const [deletingManufacturer, setDeletingManufacturer] = useState<ManufacturerProps | null>(null);

  const handleAdd = useCallback(() => {
    setEditingManufacturer(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: ManufacturerProps) => {
    setEditingManufacturer(item);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((item: ManufacturerProps) => {
    setDeletingManufacturer(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setDeletingManufacturer(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setDeletingManufacturer(null);
    }
  }, []);

  const columns = useMemo(
    () => createColumns({ onEdit: handleEdit, onDelete: handleDelete, page }),
    [handleEdit, handleDelete, page]
  );

  return (
    <div className="space-y-3 mt-4 px-4">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Hệ thống</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-bold">
                  Danh sách hãng phim
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
            Thêm hãng phim
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
        <ManufacturerDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingManufacturer={editingManufacturer}
        />
      )}
      {deletingManufacturer && (
        <DeleteManufacturerDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={deletingManufacturer.id}
          name={deletingManufacturer.name}
        />
      )}
    </div>
  );
};

export default ManufacturesClient;
