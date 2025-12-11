"use client";

import {
  createSeatTypeAction,
  updateSeatTypeAction,
} from "@/actions/seat-type-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { SeatTypeFormInput } from "@/lib/schemas/seat-type-schema";
import { SeatTypeProps } from "@/types";
import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";
import SeatTypeForm from "./seat-type-form";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface SeatTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSeatType?: SeatTypeProps | null;
}

const SeatTypeDialog = ({
  open,
  onOpenChange,
  editingSeatType,
}: SeatTypeDialogProps) => {
  const isEdit = !!editingSeatType;
  const [state, action, pending] = useActionState(
    isEdit ? updateSeatTypeAction : createSeatTypeAction,
    INITIAL_STATE
  );

  const onSubmit = (values: SeatTypeFormInput) => {
    const formData = new FormData();
    if (isEdit && editingSeatType) {
      formData.append("id", editingSeatType.id.toString());
    }
    Object.entries(values).forEach(([key, value]) => {
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
        isEdit ? "Cập nhật vị trí thành công" : "Thêm vị trí thành công"
      );
      onOpenChange(false);
    }
  }, [state, isEdit, onOpenChange]);

  const getDefaultValues = (): Partial<SeatTypeFormInput> | undefined => {
    if (!editingSeatType) return undefined;
    return { ...editingSeatType };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[604px]">
        <DialogHeader className="border-b">
          <DialogTitle>
            {isEdit ? "Cập nhật vị trí" : "Thêm mới vị trí"}
          </DialogTitle>
        </DialogHeader>
        <div>
          <SeatTypeForm
            onSubmit={onSubmit}
            defaultValues={getDefaultValues()}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={pending}>
              Hủy
            </Button>
          </DialogClose>
          <Button type="submit" form="seat-type-form" disabled={pending}>
            {pending && <Spinner />}
            {isEdit ? "Cập nhật" : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SeatTypeDialog;
