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
import { ApiResponse, ContractTicketSaleProps } from "@/types";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { createColumns } from "./columns";
import ContractTicketSaleDialog from "./contract-ticket-sale-dialog";
import DeleteContractTicketSaleDialog from "./delete-contract-ticket-sale-dialog";
import ContractTicketSaleUpdateSeatDialog from "./contract-ticket-sale-update-seat-dialog";

interface ContractTicketSalesClientProps {
  data: ApiResponse<ContractTicketSaleProps>;
  page: number;
}

const ContractTicketSalesClient = ({
  data,
  page,
}: ContractTicketSalesClientProps) => {
  const [tableData, setTableData] = useState<ContractTicketSaleProps[]>(
    data.data ?? []
  );

  const planScreenIds = useMemo(() => {
    return [
      ...new Set(
        tableData
          .map(i => i.items?.[0]?.planScreenId)
          .filter((id): id is number => typeof id === "number")
      ),
    ];
  }, [tableData]);

  const isTabletOrMobile = useMediaQuery({ query: "(max-width: 1024px)" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogUpdateSeatOpen, setDialogUpdateSeatOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] =
    useState<ContractTicketSaleProps | null>(null);

  const handleAdd = useCallback(() => {
    setSelectedItem(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: ContractTicketSaleProps) => {
    setSelectedItem(item);
    setDialogOpen(true);
  }, []);

  const handleUpdateSeat = useCallback((item: ContractTicketSaleProps) => {
    setSelectedItem(item);
    setDialogUpdateSeatOpen(true);
  }, []);

  const handlePrint = useCallback((item: ContractTicketSaleProps) => {
    console.log(item);
  }, []);

  const handleDelete = useCallback((item: ContractTicketSaleProps) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleDialogUpdateSeatClose = useCallback((open: boolean) => {
    setDialogUpdateSeatOpen(open);
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
        onEdit: handleEdit,
        onDelete: handleDelete,
        onUpdateSeat: handleUpdateSeat,
        onPrint: handlePrint,
        page,
      }),
    [handleEdit, handleDelete, page, handleUpdateSeat, handlePrint]
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
                <BreadcrumbPage>Bán vé</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-bold">
                  Danh sách vé bán hợp đồng
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
        <ContractTicketSaleDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingContractTicketSale={selectedItem}
        />
      )}

      {dialogUpdateSeatOpen && (
        <ContractTicketSaleUpdateSeatDialog
          open={dialogUpdateSeatOpen}
          onOpenChange={handleDialogUpdateSeatClose}
          editingContractTicketSale={selectedItem}
        />
      )}

      {deleteDialogOpen && selectedItem && (
        <DeleteContractTicketSaleDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={selectedItem.id}
          name={selectedItem.customerLastName}
        />
      )}
    </div>
  );
};

export default ContractTicketSalesClient;
