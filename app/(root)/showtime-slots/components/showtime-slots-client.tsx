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
import {
  ApiResponse,
  DayPartProps,
} from "@/types";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { createColumns } from "./columns";
import DeleteShowtimeSlotDialog from "./delete-showtime-slot-dialog";
import ShowtimeSlotDialog from "./showtime-slot-dialog";

interface ShowtimeSlotsClientProps {
  data: ApiResponse<DayPartProps>;
  page: number;
}

const ShowtimeSlotsClient = ({
  data,
  page,
}: ShowtimeSlotsClientProps) => {
  const isTabletOrMobile = useMediaQuery({ query: "(max-width: 1024px)" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingShowtimeSlot, setEditingShowtimeSlot] =
    useState<DayPartProps | null>(null);
  const [deletingShowtimeSlot, setDeletingShowtimeSlot] =
    useState<DayPartProps | null>(null);

  const handleAdd = useCallback(() => {
    setEditingShowtimeSlot(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: DayPartProps) => {
    setEditingShowtimeSlot(item);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((item: DayPartProps) => {
    setDeletingShowtimeSlot(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingShowtimeSlot(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setDeletingShowtimeSlot(null);
    }
  }, []);

  const columns = useMemo(
    () =>
      createColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        page,
      }),
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
                <BreadcrumbPage>Quản lý danh sách</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-bold">
                  Danh sách khung giờ chiếu
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
        <ShowtimeSlotDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingShowtimeSlot={editingShowtimeSlot}
        />
      )}
      {deletingShowtimeSlot && (
        <DeleteShowtimeSlotDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={deletingShowtimeSlot.id}
          name={deletingShowtimeSlot.name}
        />
      )}
    </div>
  );
};

export default ShowtimeSlotsClient;

