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
import { ApiResponse, BackgroundProps, OrderDetailProps } from "@/types";
import { useCallback, useMemo, useState } from "react";
import { useMediaQuery } from "react-responsive";
import AddInvitationTicketDialog from "./add-invitation-ticket-dialog";
import { createColumns } from "./columns";
import DeleteContractTicketSaleDialog from "./delete-invitation-ticket-dialog";
import PrintInvitationTicketDialog from "./print-invitation-ticket-dialog";

interface InvitationTicketsClientProps {
  data: ApiResponse<OrderDetailProps>;
  page: number;
  backgrounds: BackgroundProps[];
}

const InvitationTicketsClient = ({
  data,
  page,
  backgrounds,
}: InvitationTicketsClientProps) => {
  const isTabletOrMobile = useMediaQuery({ query: "(max-width: 1024px)" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPrintOpen, setDialogPrintOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderDetailProps | null>(
    null
  );

  const handleAdd = useCallback(() => {
    setSelectedItem(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: OrderDetailProps) => {
    setSelectedItem(item);
    setDialogOpen(true);
  }, []);

  const handlePrint = useCallback((item: OrderDetailProps) => {
    setSelectedItem(item);
    setDialogPrintOpen(true);
  }, []);

  const handleDelete = useCallback((item: OrderDetailProps) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleDialogPrintClose = useCallback((open: boolean) => {
    setDialogPrintOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const columns = useMemo(
    () =>
      createColumns({
        onViewDetail: handleEdit,
        onDelete: handleDelete,
        onPrint: handlePrint,
        page,
      }),
    [handleEdit, handleDelete, page, handlePrint]
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
                <BreadcrumbPage>Bán vé</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-bold">
                  Quản lý giấy mời
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
            Xem sơ đồ vé
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
        <AddInvitationTicketDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
        />
      )}

      {dialogPrintOpen && (
        <PrintInvitationTicketDialog
          open={dialogPrintOpen}
          onOpenChange={handleDialogPrintClose}
          backgrounds={backgrounds}
        />
      )}

      {deleteDialogOpen && selectedItem && (
        <DeleteContractTicketSaleDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={selectedItem.order.id}
          name={selectedItem.order.barCode}
        />
      )}
    </div>
  );
};

export default InvitationTicketsClient;
