"use client";

import {
  createTicketPriceAction,
  updateTicketPriceAction,
} from "@/actions/ticket-price-actions";
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
import { TicketPriceFormInput } from "@/lib/schemas/ticket-price-schema";
import { DayPartProps, SeatTypeProps, TicketPriceProps } from "@/types";
import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";
import TicketPriceForm from "./ticket-price-form";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface TicketPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTicketPrice?: TicketPriceProps | null;
  positions?: SeatTypeProps[];
  dayparts?: DayPartProps[];
}

const TicketPriceDialog = ({
  open,
  onOpenChange,
  editingTicketPrice,
  positions = [],
  dayparts = [],
}: TicketPriceDialogProps) => {
  const isEdit = !!editingTicketPrice;
  const [state, action, pending] = useActionState(
    isEdit ? updateTicketPriceAction : createTicketPriceAction,
    INITIAL_STATE
  );

  const onSubmit = (values: TicketPriceFormInput) => {
    const formData = new FormData();
    if (isEdit && editingTicketPrice) {
      formData.append("id", editingTicketPrice.id.toString());
    }
    formData.append("versionCode", values.versionCode);
    formData.append("daypartId", values.daypartId.toString());
    formData.append("positionId", values.positionId.toString());
    formData.append("price", values.price.toString());
    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }

    if (state.success) {
      toast.success(
        isEdit ? "Cập nhật giá vé thành công" : "Thêm giá vé thành công"
      );
      onOpenChange(false);
    }
  }, [state, isEdit, onOpenChange]);

  const getDefaultValues = (): Partial<TicketPriceFormInput> | undefined => {
    if (!editingTicketPrice) return undefined;
    return {
      versionCode: editingTicketPrice.versionCode,
      daypartId: editingTicketPrice.daypartId,
      positionId: editingTicketPrice.positionId,
      price: editingTicketPrice.price,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[612px]">
        <DialogHeader className="border-b">
          <DialogTitle>
            {isEdit ? "Cập nhật giá vé" : "Thêm mới giá vé"}
          </DialogTitle>
        </DialogHeader>
        <div>
          <TicketPriceForm
            onSubmit={onSubmit}
            defaultValues={getDefaultValues()}
            positions={positions}
            dayparts={dayparts}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={pending}>
              Hủy
            </Button>
          </DialogClose>
          <Button type="submit" form="ticket-price-form" disabled={pending}>
            {pending && <Spinner />}
            {isEdit ? "Cập nhật" : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TicketPriceDialog;
