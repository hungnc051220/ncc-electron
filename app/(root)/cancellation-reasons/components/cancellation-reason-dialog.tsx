"use client";

import {
  createCancellationReasonAction,
  updateCancellationReasonAction,
} from "@/actions/cancellation-reason-actions";
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
import { CancellationReasonFormInput } from "@/lib/schemas/cancellation-reason-schema";
import { CancellationReasonProps } from "@/types";
import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";
import CancellationReasonForm from "./cancellation-reason-form";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface CancellationReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCancellationReason?: CancellationReasonProps | null;
}

const CancellationReasonDialog = ({
  open,
  onOpenChange,
  editingCancellationReason,
}: CancellationReasonDialogProps) => {
  const isEdit = !!editingCancellationReason;
  const [state, action, pending] = useActionState(
    isEdit ? updateCancellationReasonAction : createCancellationReasonAction,
    INITIAL_STATE
  );

  const onSubmit = (values: CancellationReasonFormInput) => {
    const formData = new FormData();
    if (isEdit && editingCancellationReason) {
      formData.append("id", editingCancellationReason.id.toString());
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
        isEdit ? "Cập nhật lý do hủy thành công" : "Thêm lý do hủy thành công"
      );
      onOpenChange(false);
    }
  }, [state, isEdit, onOpenChange]);

  const getDefaultValues = (): Partial<CancellationReasonFormInput> | undefined => {
    if (!editingCancellationReason) return undefined;
    return {
      reason: editingCancellationReason.reason,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[476px]">
        <DialogHeader className="border-b">
          <DialogTitle>
            {isEdit ? "Cập nhật lý do hủy" : "Thêm mới lý do hủy"}
          </DialogTitle>
        </DialogHeader>
        <div>
          <CancellationReasonForm
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
          <Button
            type="submit"
            form="cancellation-reason-form"
            disabled={pending}
          >
            {pending && <Spinner />}
            {isEdit ? "Cập nhật" : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancellationReasonDialog;
