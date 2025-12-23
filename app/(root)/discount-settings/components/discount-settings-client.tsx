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
import { ApiResponse, DiscountProps } from "@/types";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { createColumns } from "./columns";
import DeleteDiscountDialog from "./delete-discount-dialog";
import DiscountSettingsDialog from "./discount-settings-dialog";

interface DiscountSettingsClientProps {
  data: ApiResponse<DiscountProps>;
  page: number;
}

const DiscountSettingsClient = ({
  data,
  page,
}: DiscountSettingsClientProps) => {
  const isTabletOrMobile = useMediaQuery({ query: "(max-width: 1024px)" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(true);
  const [editingDiscount, setEditingDiscount] = useState<DiscountProps | null>(
    null
  );
  const [deletingDiscount, setDeletingDiscount] =
    useState<DiscountProps | null>(null);

  const handleAdd = useCallback(() => {
    setEditingDiscount(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: DiscountProps) => {
    setEditingDiscount(item);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((item: DiscountProps) => {
    setDeletingDiscount(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingDiscount(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setDeletingDiscount(null);
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
                <BreadcrumbPage>Kế hoạch chiếu phim</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-bold">
                  Thiết lập giảm giá
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
        <DiscountSettingsDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingDiscount={editingDiscount}
        />
      )}
      {deletingDiscount && (
        <DeleteDiscountDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={deletingDiscount.id}
          name={deletingDiscount.discountName}
        />
      )}
    </div>
  );
};

export default DiscountSettingsClient;
