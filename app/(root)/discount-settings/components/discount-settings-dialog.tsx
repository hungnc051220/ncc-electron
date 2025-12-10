"use client";

import {
  createDiscountAction,
  updateDiscountAction,
} from "@/actions/discount-actions";
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
import { DiscountFormInput } from "@/lib/schemas/discount-schema";
import { DiscountProps } from "@/types";
import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";
import DiscountSettingsForm from "./discount-settings-form";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface DiscountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDiscount?: DiscountProps | null;
}

const DiscountSettingsDialog = ({
  open,
  onOpenChange,
  editingDiscount,
}: DiscountSettingsDialogProps) => {
  const isEdit = !!editingDiscount;
  const [state, action, pending] = useActionState(
    isEdit ? updateDiscountAction : createDiscountAction,
    INITIAL_STATE
  );

  const onSubmit = (values: DiscountFormInput) => {
    const formData = new FormData();
    if (isEdit && editingDiscount) {
      formData.append("id", editingDiscount.id.toString());
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
        isEdit ? "Cập nhật giảm giá thành công" : "Thêm giảm giá thành công"
      );
      onOpenChange(false);
    }
  }, [state, isEdit, onOpenChange]);

  const getDefaultValues = (): Partial<DiscountFormInput> | undefined => {
    if (!editingDiscount) return undefined;
    return {
      discountName: editingDiscount.discountName,
      discountAmount: editingDiscount.discountAmount,
      discountRate: editingDiscount.discountRate,
      discountType: !editingDiscount.discountAmount ? "rate" : "amount",
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[476px]">
        <DialogHeader className="border-b">
          <DialogTitle>
            {isEdit ? "Cập nhật giảm giá" : "Thêm mới giảm giá"}
          </DialogTitle>
        </DialogHeader>
        <div>
          <DiscountSettingsForm
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
            form="discount-settings-form"
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

export default DiscountSettingsDialog;
