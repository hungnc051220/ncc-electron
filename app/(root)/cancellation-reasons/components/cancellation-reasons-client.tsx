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
import { ApiResponse, CancellationReasonProps } from "@/types";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { createColumns } from "./columns";
import DeleteCancellationReasonDialog from "./delete-cancellation-reason-dialog";
import CancellationReasonDialog from "./cancellation-reason-dialog";

interface CancellationReasonsClientProps {
  data: ApiResponse<CancellationReasonProps>;
  page: number;
}

const CancellationReasonsClient = ({
  data,
  page,
}: CancellationReasonsClientProps) => {
  const isTabletOrMobile = useMediaQuery({ query: "(max-width: 1024px)" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(true);
  const [editingCancellationReason, setEditingCancellationReason] = useState<CancellationReasonProps | null>(
    null
  );
  const [deletingCancellationReason, setDeletingCancellationReason] =
    useState<CancellationReasonProps | null>(null);

  const handleAdd = useCallback(() => {
    setEditingCancellationReason(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: CancellationReasonProps) => {
    setEditingCancellationReason(item);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((item: CancellationReasonProps) => {
    setDeletingCancellationReason(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingCancellationReason(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setDeletingCancellationReason(null);
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
                <BreadcrumbPage className="font-bold">
                  Lý do hủy
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
        <CancellationReasonDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingCancellationReason={editingCancellationReason}
        />
      )}
      {deletingCancellationReason && (
        <DeleteCancellationReasonDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={deletingCancellationReason.id}
          name={deletingCancellationReason.reason}
        />
      )}
    </div>
  );
};

export default CancellationReasonsClient;
