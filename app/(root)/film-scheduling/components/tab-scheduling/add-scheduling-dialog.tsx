"use client";

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
import { addPlanFilmAction } from "@/actions/plan-cinema-actions";
import { getFilms } from "@/data/loaders";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { RowSelectionState } from "@tanstack/react-table";
import { startTransition, useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import AddSchedulingForm from "./add-scheduling-form";
import { AddSchedulingFormInput } from "@/lib/schemas/add-scheduling-schema";
import { format, formatISO } from "date-fns";
import { createPlanScreeningAction } from "@/actions/plan-screening-actions";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface AddMoviesProps {
  planCinemaId: number;
}

const AddScreenings = ({ planCinemaId }: AddMoviesProps) => {
  const queryClient = useQueryClient();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["movies"],
      queryFn: ({ pageParam = 1 }) => getFilms(`?current=${pageParam}`),
      initialPageParam: 1,
      getNextPageParam: (lastPage, pages) => {
        const currentPage = pages.length;
        return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
      },
    });

  const films = data?.pages.flatMap((page) => page.data) ?? [];

  const [open, setOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [state, action, pending] = useActionState(
    createPlanScreeningAction,
    INITIAL_STATE
  );
  const handleSubmit = (values: AddSchedulingFormInput) => {
    console.log(values)

    const formData = new FormData();
    formData.append("planCinemaId", planCinemaId.toString());
    formData.append("projectDate", format(values.projectDate, "yyyy-MM-dd"));
    formData.append("projectTime", formatISO(values.projectDate));
    formData.append("filmId", values.filmId.toString());
    formData.append("roomId", values.roomId.toString());
    formData.append("priceOfPosition1", values.priceOfPosition1.toString());
    formData.append("priceOfPosition2", values.priceOfPosition2.toString());
    formData.append("priceOfPosition3", values.priceOfPosition3.toString());
    formData.append("priceOfPosition4", values.priceOfPosition4.toString());

    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }

    if (state.success) {
      toast.success("Thêm ca chiếu vào kế hoạch thành công");
      queryClient.invalidateQueries({ queryKey: ["plan-film"] });
      startTransition(() => {
        setOpen(false);
        setRowSelection({});
      });
    }
  }, [state, queryClient]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setRowSelection({});
    }
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
          <AddSchedulingForm planCinemaId={planCinemaId} onSubmit={handleSubmit}/>
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

export default AddScreenings;
