"use client";

import { createPlanScreeningAction } from "@/actions/plan-screening-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { AddSchedulingFormInput } from "@/lib/schemas/add-scheduling-schema";
import { useQueryClient } from "@tanstack/react-query";
import { format, formatISO } from "date-fns";
import { startTransition, useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import AddSchedulingForm from "./add-scheduling-form";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface AddSchedulingDialogProps {
  planCinemaId: number;
}

const AddSchedulingDialog = ({ planCinemaId }: AddSchedulingDialogProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    createPlanScreeningAction,
    INITIAL_STATE
  );
  const handleSubmit = (values: AddSchedulingFormInput) => {
    const formData = new FormData();
    formData.append("planCinemaId", planCinemaId.toString());
    formData.append("projectDate", format(values.projectDate, "yyyy-MM-dd"));
    formData.append("projectTime", formatISO(values.projectDate));
    formData.append("filmId", values.filmId.toString());
    formData.append("roomId", values.roomId.toString());
    if (values.priceOfPosition1) {
      formData.append("priceOfPosition1", values.priceOfPosition1);
    }
    if (values.priceOfPosition2) {
      formData.append("priceOfPosition2", values.priceOfPosition2);
    }
    if (values.priceOfPosition3) {
      formData.append("priceOfPosition3", values.priceOfPosition3);
    }
    if (values.priceOfPosition4) {
      formData.append("priceOfPosition4", values.priceOfPosition4);
    }

    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }

    if (state.success) {
      toast.success("Thêm ca chiếu vào kế hoạch thành công");
      queryClient.invalidateQueries({ queryKey: ["plan-screenings"] });
      startTransition(() => {
        setOpen(false);
      });
    }
  }, [state, queryClient]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Thêm ca chiếu mới</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[795px]">
        <DialogHeader className="border-b">
          <DialogTitle>Thêm ca chiếu mới</DialogTitle>
        </DialogHeader>

        <div>
          <AddSchedulingForm
            planCinemaId={planCinemaId}
            onSubmit={handleSubmit}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={pending}>
              Hủy
            </Button>
          </DialogClose>
          <Button type="submit" form="add-scheduling-form" disabled={pending}>
            {pending && <Spinner />}
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddSchedulingDialog;
