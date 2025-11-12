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
import { addPlanFilmAction } from "@/data/actions";
import { getFilms } from "@/data/loaders-server";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { RowSelectionState } from "@tanstack/react-table";
import { startTransition, useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "./data-table";
import { columns } from "./movie-columns";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface AddMoviesProps {
  planCinemaId: number;
}

const AddMovies = ({ planCinemaId }: AddMoviesProps) => {
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
    addPlanFilmAction,
    INITIAL_STATE
  );
  const handleSubmit = () => {
    const selectedFilmIds = Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((key) => {
        const film = films[Number(key)];
        return film?.id;
      })
      .filter((id): id is number => id !== undefined);

    if (selectedFilmIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một phim");
      return;
    }

    const formData = new FormData();
    formData.append("planCinemaId", String(planCinemaId));
    formData.append("filmIds", JSON.stringify(selectedFilmIds));

    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }

    if (state.success) {
      toast.success("Thêm phim vào kế hoạch thành công");
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
        <Button>Thêm phim cho kế hoạch</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[795px]">
        <DialogHeader className="border-b">
          <DialogTitle>Thêm phim cho kế hoạch</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5">
          <DataTable
            columns={columns}
            data={films}
            loading={isLoading}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={pending}>
              Hủy
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={pending}>
            {pending && <Spinner />}
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddMovies;
