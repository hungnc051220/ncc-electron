"use client";

import { createHolidayAction } from "@/actions/holiday-actions";
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
import { HolidayFormInput } from "@/lib/schemas/holiday-schema";
import { format } from "date-fns";
import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";
import HolidayForm from "./holiday-form";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface HolidayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: string;
  dayTypeId: number;
}

const HolidayDialog = ({
  open,
  onOpenChange,
  year,
  dayTypeId,
}: HolidayDialogProps) => {
  const [state, action, pending] = useActionState(
    createHolidayAction,
    INITIAL_STATE
  );

  const onSubmit = (values: HolidayFormInput) => {
    const formData = new FormData();
    formData.append("year", year);
    formData.append("dateTypeId", dayTypeId.toString());
    formData.append("daysInWeek", JSON.stringify(values.daysInWeek));
    formData.append("specialDates", JSON.stringify(values.specialDates));
    if (values.specificDate) {
      formData.append(
        "specificDate",
        format(values.specificDate, "yyyy-MM-dd")
      );
    }
    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }

    if (state.success) {
      toast.success(
        `Cập nhật danh sách ${dayTypeId === 1 ? "Ngày thường" : "Ngày lễ"} thành công`
      );
      onOpenChange(false);
    }
  }, [state, onOpenChange, dayTypeId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[612px]">
        <DialogHeader className="border-b">
          <DialogTitle>
            Cập nhật lại {dayTypeId === 1 ? "Ngày thường" : "Ngày lễ"}
          </DialogTitle>
        </DialogHeader>
        <div>
          <HolidayForm onSubmit={onSubmit} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={pending}>
              Hủy
            </Button>
          </DialogClose>
          <Button type="submit" form="holiday-form" disabled={pending}>
            {pending && <Spinner />}
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HolidayDialog;
