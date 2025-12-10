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
import { ApiResponse, RoomProps } from "@/types";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { createColumns } from "./columns";
import DeleteScreeningRoomDialog from "./delete-sccreening-room-dialog";
import ScreeningRoomsDialog from "./screening-rooms-dialog";

interface ScreeningRoomsClientProps {
  data: ApiResponse<RoomProps>;
  page: number;
}

const ScreeningRoomsClient = ({ data, page }: ScreeningRoomsClientProps) => {
  const isTabletOrMobile = useMediaQuery({ query: "(max-width: 1024px)" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(true);
  const [editingScreeningRoom, setEditingScreeningRoom] =
    useState<RoomProps | null>(null);
  const [deletingScreeningRoom, setDeletingScreeningRoom] =
    useState<RoomProps | null>(null);

  const handleAdd = useCallback(() => {
    setEditingScreeningRoom(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: RoomProps) => {
    setEditingScreeningRoom(item);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((item: RoomProps) => {
    setDeletingScreeningRoom(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setDeletingScreeningRoom(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setDeletingScreeningRoom(null);
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
                  Danh sách phòng chiếu
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
        <ScreeningRoomsDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingScreeningRoom={editingScreeningRoom}
        />
      )}
      {deletingScreeningRoom && (
        <DeleteScreeningRoomDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={deletingScreeningRoom.id}
          name={deletingScreeningRoom.name}
        />
      )}
    </div>
  );
};

export default ScreeningRoomsClient;
