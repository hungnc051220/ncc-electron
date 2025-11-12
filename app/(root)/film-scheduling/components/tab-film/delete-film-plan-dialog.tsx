"use client";

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
import { deletePlanCinemaAction } from "@/data/actions";
import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface DeleteFilmPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planCinemaId: number;
  name: string;
}

const DeleteFilmPlanDialog = ({
  open,
  onOpenChange,
  planCinemaId,
  name,
}: DeleteFilmPlanDialogProps) => {
  const [state, action, pending] = useActionState(
    deletePlanCinemaAction,
    INITIAL_STATE
  );

  const handleDelete = () => {
    const formData = new FormData();
    formData.append("planCinemaId", planCinemaId.toString());
    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    } else if (state.success) {
      toast.success("Xóa kế hoạch chiếu phim thành công");
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận xóa kế hoạch?</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn xóa phim khỏi kế hoạch <strong>{name}</strong>?
            <p>Khi xóa phim, toàn bộ ca chiếu trong kế hoạch sẽ bị xóa theo.</p>
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

export default DeleteFilmPlanDialog;
