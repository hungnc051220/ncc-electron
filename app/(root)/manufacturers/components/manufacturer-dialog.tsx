"use client";

import { createManufacturerAction, updateManufacturerAction } from "@/actions/manufacturer-actions";
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
import { ManufacturerFormInput } from "@/lib/schemas/manufacturer-schema";
import { ManufacturerProps } from "@/types";
import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";
import ManufacturerForm from "./manufacturer-form";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface ManufacturerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingManufacturer?: ManufacturerProps | null;
}

const ManufacturerDialog = ({
  open,
  onOpenChange,
  editingManufacturer,
}: ManufacturerDialogProps) => {
  const isEdit = !!editingManufacturer;
  const [state, action, pending] = useActionState(
    isEdit ? updateManufacturerAction : createManufacturerAction,
    INITIAL_STATE
  );

  const onSubmit = (values: ManufacturerFormInput) => {
    const formData = new FormData();
    if (isEdit && editingManufacturer) {
      formData.append("id", editingManufacturer.id.toString());
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
        isEdit ? "Cập nhật hãng phim thành công" : "Thêm hãng phim thành công"
      );
      onOpenChange(false);
    }
  }, [state, isEdit, onOpenChange]);

  const getDefaultValues = (): Partial<ManufacturerFormInput> | undefined => {
    if (!editingManufacturer) return undefined;
    return {
      name: editingManufacturer.name,
      fullName: editingManufacturer.fullName,
      bankName: editingManufacturer.bankName,
      phoneNumber: editingManufacturer.phoneNumber,
      acountBank: editingManufacturer.acountBank,
      addressBank: editingManufacturer.addressBank,
      address: editingManufacturer.address,
      fax: editingManufacturer.fax,
      url: editingManufacturer.url,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[612px]">
        <DialogHeader className="border-b">
          <DialogTitle>
            {isEdit ? "Cập nhật hãng phim" : "Thêm mới hãng phim"}
          </DialogTitle>
        </DialogHeader>
        <div>
          <ManufacturerForm
            onSubmit={onSubmit}
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
          <Button type="submit" form="manufacturer-form" disabled={pending}>
            {pending && <Spinner />}
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManufacturerDialog;
