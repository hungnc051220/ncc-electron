"use client";

import { deleteFilmAction } from "@/actions/film-actions";
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

interface DeleteFilmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filmId: number;
  filmName: string;
}

const DeleteFilmDialog = ({
  open,
  onOpenChange,
  filmId,
  filmName,
}: DeleteFilmDialogProps) => {
  const [state, action, pending] = useActionState(
    deleteFilmAction,
    INITIAL_STATE
  );

  const handleDelete = () => {
    const formData = new FormData();
    formData.append("filmId", filmId.toString());
    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    } else if (state.success) {
      toast.success("Xóa phim thành công");
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận xóa phim</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn xóa phim <strong>{filmName}</strong>?
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

export default DeleteFilmDialog;
