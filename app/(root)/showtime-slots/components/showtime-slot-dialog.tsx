"use client";

import {
  createShowtimeSlotAction,
  updateShowtimeSlotAction,
} from "@/actions/showtime-slot-actions";
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
import { ShowtimeSlotFormInput } from "@/lib/schemas/showtime-slot-schema";
import { DayPartProps } from "@/types";
import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";
import ShowtimeSlotForm from "./showtime-slot-form";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface ShowtimeSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingShowtimeSlot?: DayPartProps | null;
}

const ShowtimeSlotDialog = ({
  open,
  onOpenChange,
  editingShowtimeSlot,
}: ShowtimeSlotDialogProps) => {
  const isEdit = !!editingShowtimeSlot;
  const [state, action, pending] = useActionState(
    isEdit ? updateShowtimeSlotAction : createShowtimeSlotAction,
    INITIAL_STATE
  );

  const onSubmit = (values: ShowtimeSlotFormInput) => {
    const formData = new FormData();
    if (isEdit && editingShowtimeSlot) {
      formData.append("id", editingShowtimeSlot.id.toString());
    }
    formData.append("dateTypeId", values.dateTypeId.toString());
    formData.append("name", values.name);
    formData.append("fromTime", values.fromTime);
    formData.append("toTime", values.toTime);
    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }

    if (state.success) {
      toast.success(
        isEdit ? "Cập nhật khung giờ chiếu thành công" : "Thêm khung giờ chiếu thành công"
      );
      onOpenChange(false);
    }
  }, [state, isEdit, onOpenChange]);

  const getDefaultValues = (): Partial<ShowtimeSlotFormInput> | undefined => {
    if (!editingShowtimeSlot) return undefined;
    return {
      dateTypeId: editingShowtimeSlot.dateTypeId,
      name: editingShowtimeSlot.name,
      fromTime: editingShowtimeSlot.fromTime,
      toTime: editingShowtimeSlot.toTime,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[612px]">
        <DialogHeader className="border-b">
          <DialogTitle>
            {isEdit ? "Cập nhật khung giờ chiếu" : "Thêm mới khung giờ chiếu"}
          </DialogTitle>
        </DialogHeader>
        <div>
          <ShowtimeSlotForm
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
          <Button type="submit" form="showtime-slot-form" disabled={pending}>
            {pending && <Spinner />}
            {isEdit ? "Cập nhật" : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShowtimeSlotDialog;

