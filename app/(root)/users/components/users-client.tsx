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
import DeleteUserDialog from "./delete-user-dialog";
import Filter from "./filter";
import UserDialog from "./user-dialog";
import { DataTable } from "@/components/data-table";
import { useMediaQuery } from "react-responsive";
import ChangeHiddenUserDialog from "./change-hidden-user-dialog";

interface UsersClientProps {
  data: ApiResponse<UserProps>;
  customerRoles: CustomerRoleProps[];
  page: number;
}

const UsersClient = ({ data, customerRoles, page }: UsersClientProps) => {
  const isTabletOrMobile = useMediaQuery({ query: "(max-width: 1024px)" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [changeHiddenDialogOpen, setChangeHiddenDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProps | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProps | null>(null);
  const [editingHidden, setEditingHidden] = useState<UserProps | null>(null);
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

  const handleChangeHidden = useCallback((user: UserProps) => {
    setEditingHidden(user);
    setChangeHiddenDialogOpen(true);
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

  const handleChangeHiddenDialogClose = useCallback((open: boolean) => {
    setChangeHiddenDialogOpen(open);
    if (!open) {
      setEditingHidden(null);
    }
  }, []);

  const columns = useMemo(
    () =>
      createColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        page,
        onChangeHidden: handleChangeHidden,
      }),
    [handleEdit, handleDelete, page, handleChangeHidden]
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
                  Quản lý người dùng
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex gap-2 items-center">
          <Filter
            customerRoles={customerRoles}
            onSearchingChange={setIsSearching}
            isTabletOrMobile={isTabletOrMobile}
          />
          <Button
            onClick={handleAdd}
            size={isTabletOrMobile ? "sm" : "default"}
          >
            <PlusIcon className={isTabletOrMobile ? "size-3" : "size-4"} />
            Thêm người dùng
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data.data}
        total={data.total}
        loading={isSearching}
        className="max-h-[calc(100vh-200px)]"
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
      {editingHidden && (
        <ChangeHiddenUserDialog
          open={changeHiddenDialogOpen}
          onOpenChange={handleChangeHiddenDialogClose}
          user={editingHidden}
          username={editingHidden.username}
        />
      )}
    </div>
  );
};

export default UsersClient;
