"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ApiResponse, CustomerRoleProps, UserProps } from "@/types";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { createColumns } from "./columns";
import { DataTable } from "./data-table";
import DeleteUserDialog from "./delete-user-dialog";
import Filter from "./filter";
import UserDialog from "./user-dialog";

interface UsersClientProps {
  data: ApiResponse<UserProps>;
  customerRoles: CustomerRoleProps[];
  page: number;
}

const UsersClient = ({ data, customerRoles, page }: UsersClientProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProps | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProps | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleAdd = useCallback(() => {
    setEditingUser(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((user: UserProps) => {
    setEditingUser(user);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((user: UserProps) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingUser(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setDeletingUser(null);
    }
  }, []);

  const columns = useMemo(
    () => createColumns({ onEdit: handleEdit, onDelete: handleDelete, page }),
    [handleEdit, handleDelete, page]
  );

  return (
    <div className="space-y-8">
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
                <BreadcrumbPage>Quản lý người dùng</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h3 className="font-bold text-2xl mt-1">Quản lý người dùng</h3>
        </div>

        <Button onClick={handleAdd}>
          <PlusIcon className="size-6" />
          Thêm người dùng
        </Button>
      </div>

      <Filter
        customerRoles={customerRoles}
        onSearchingChange={setIsSearching}
      />
      <DataTable
        columns={columns}
        data={data.data}
        total={data.total}
        loading={isSearching}
      />
      {dialogOpen && (
        <UserDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          customerRoles={customerRoles}
          editingUser={editingUser}
        />
      )}
      {deletingUser && (
        <DeleteUserDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          userId={deletingUser.id}
          username={deletingUser.username}
        />
      )}
    </div>
  );
};

export default UsersClient;
