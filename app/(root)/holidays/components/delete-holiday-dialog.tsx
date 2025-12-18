"use client";

import { deleteHolidayAction } from "@/actions/holiday-actions";
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
import { format } from "date-fns";
import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface DeleteHolidayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
  name: string;
  dayType: string;
}

const DeleteHolidayDialog = ({
  open,
  onOpenChange,
  id,
  name,
  dayType,
}: DeleteHolidayDialogProps) => {
  const [state, action, pending] = useActionState(
    deleteHolidayAction,
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
      toast.success("Xóa ngày thành công");
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận xóa ngày</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn xóa ngày{" "}
            <strong>{format(name, "dd/MM/yyyy")}</strong> khỏi danh sách{" "}
            <b className="text-primary">{dayType}</b>? Hành động này không thể
            hoàn tác.
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

export default DeleteHolidayDialog;
