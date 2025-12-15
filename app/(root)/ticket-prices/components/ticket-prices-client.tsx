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
  SeatTypeProps,
  TicketPriceProps,
} from "@/types";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { createColumns } from "./columns";
import DeleteTicketPriceDialog from "./delete-ticket-price-dialog";
import TicketPriceDialog from "./ticket-price-dialog";

interface TicketPricesClientProps {
  data: ApiResponse<TicketPriceProps>;
  page: number;
  positions: SeatTypeProps[];
  dayParts: DayPartProps[];
}

const TicketPricesClient = ({
  data,
  page,
  positions,
  dayParts,
}: TicketPricesClientProps) => {
  const isTabletOrMobile = useMediaQuery({ query: "(max-width: 1024px)" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTicketPrice, setEditingTicketPrice] =
    useState<TicketPriceProps | null>(null);
  const [deletingTicketPrice, setDeletingTicketPrice] =
    useState<TicketPriceProps | null>(null);

  const handleAdd = useCallback(() => {
    setEditingTicketPrice(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: TicketPriceProps) => {
    setEditingTicketPrice(item);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((item: TicketPriceProps) => {
    setDeletingTicketPrice(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingTicketPrice(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setDeletingTicketPrice(null);
    }
  }, []);

  const columns = useMemo(
    () =>
      createColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        page,
        positions,
        dayParts,
      }),
    [handleEdit, handleDelete, page, dayParts, positions]
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
                  Danh sách giá vé
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
        <TicketPriceDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingTicketPrice={editingTicketPrice}
          positions={positions}
          dayparts={dayParts}
        />
      )}
      {deletingTicketPrice && (
        <DeleteTicketPriceDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={deletingTicketPrice.id}
          versionCode={deletingTicketPrice.versionCode}
        />
      )}
    </div>
  );
};

export default TicketPricesClient;
