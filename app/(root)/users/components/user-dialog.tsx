"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UserForm from "./user-form";
import { startTransition, useActionState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { createUserAction, updateUserAction } from "@/actions/user-actions";
import { UserFormInput } from "@/lib/schemas";
import { toast } from "sonner";
import { CustomerRoleProps, UserProps } from "@/types";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerRoles: CustomerRoleProps[];
  editingUser?: UserProps | null;
}

const UserDialog = ({
  open,
  onOpenChange,
  customerRoles,
  editingUser,
}: UserDialogProps) => {
  const isEdit = !!editingUser;
  const [state, action, pending] = useActionState(
    isEdit ? updateUserAction : createUserAction,
    INITIAL_STATE
  );

  const onSubmit = (values: UserFormInput) => {
    const formData = new FormData();
    if (isEdit && editingUser) {
      formData.append("userId", editingUser.id.toString());
    }
    Object.entries(values).forEach(([key, value]) => {
      if (isEdit && key === "password" && !value) {
        return;
      }
      formData.append(key, value as string);
    });
    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }

    if (state.success) {
      toast.success(
        isEdit ? "Cập nhật người dùng thành công" : "Thêm người dùng thành công"
      );
      onOpenChange(false);
    }
  }, [state, isEdit, onOpenChange]);

  const getDefaultValues = (): Partial<UserFormInput> | undefined => {
    if (!editingUser) return undefined;
    return {
      roleIds: editingUser.roleIds.split(",").map(Number) || [],
      username: editingUser.username || "",
      email: editingUser.email || "",
      manufacturerId: editingUser.manufacturerId || 0,
      customerFirstName: editingUser.customerFirstName || "",
      customerLastName: editingUser.customerLastName || "",
      address: editingUser.address || "",
      mobile: editingUser.mobile || "",
      password: "",
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[876px]">
        <DialogHeader className="border-b">
          <DialogTitle>
            {isEdit ? "Cập nhật người dùng" : "Thêm mới người dùng"}
          </DialogTitle>
        </DialogHeader>
        <div>
          <UserForm
            onSubmit={onSubmit}
            customerRoles={customerRoles}
            defaultValues={getDefaultValues()}
            isEdit={isEdit}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={pending}>
              Hủy
            </Button>
          </DialogClose>
          <Button type="submit" form="user-form" disabled={pending}>
            {pending && <Spinner />}
            {isEdit ? "Cập nhật" : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserDialog;
