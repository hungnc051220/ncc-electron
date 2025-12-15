"use client";

import { updateUserAction } from "@/actions/user-actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { UserProps } from "@/types";
import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface ChangeHiddenUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProps;
  username: string;
}

const ChangeHiddenUserDialog = ({
  open,
  onOpenChange,
  user,
  username,
}: ChangeHiddenUserDialogProps) => {
  const [state, action, pending] = useActionState(
    updateUserAction,
    INITIAL_STATE
  );

  const handleChangeHidden = () => {
    const formData = new FormData();
    formData.append("userId", user.id.toString());
    Object.entries(user).forEach(([key, value]) => {
      if (key === "password" && !value) {
        return;
      }
      if(key === "isHidden") {
        formData.append(key, value ? "true" : "false");
      }
      formData.append(key, value as string);
    });
    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    } else if (state.success) {
      toast.success("Thay đổi ẩn/hiện người dùng thành công");
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Xác nhận thay đổi trạng thái ẩn/hiện người dùng
          </AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn thay đổi trạng thái ẩn/hiện người dùng{" "}
            <strong>{username}</strong>? Hành động này không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
          <Button
            onClick={handleChangeHidden}
            disabled={pending}
            className="bg-dodoria hover:bg-dodoria/90 text-white"
          >
            {pending && <Spinner className="mr-2" />}
            Xác nhận
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ChangeHiddenUserDialog;
