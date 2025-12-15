"use client";

import { deleteTicketPriceAction } from "@/actions/ticket-price-actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface DeleteTicketPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number;
  versionCode: string;
}

const DeleteTicketPriceDialog = ({
  open,
  onOpenChange,
  id,
  versionCode,
}: DeleteTicketPriceDialogProps) => {
  const [state, action, pending] = useActionState(
    deleteTicketPriceAction,
    INITIAL_STATE
  );

  const handleDelete = () => {
    const formData = new FormData();
    formData.append("id", id.toString());
    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    } else if (state.success) {
      toast.success("Xóa giá vé thành công");
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận xóa giá vé</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn xóa giá vé với mã phiên bản <strong>{versionCode}</strong>?
            Hành động này không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
          <Button
            onClick={handleDelete}
            disabled={pending}
            className="bg-dodoria hover:bg-dodoria/90 text-white"
          >
            {pending && <Spinner className="mr-2" />}
            Xóa
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteTicketPriceDialog;

