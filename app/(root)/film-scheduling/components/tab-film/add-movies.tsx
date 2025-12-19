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
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { addPlanFilmAction } from "@/actions/plan-cinema-actions";
import { getFilms } from "@/data/loaders";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { RowSelectionState } from "@tanstack/react-table";
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import queryString from "query-string";
import { toast } from "sonner";
import { DataTable } from "./data-table";
import { getMovieColumns } from "./movie-columns";
import { PlanFilmProps } from "@/types";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface AddMoviesProps {
  planCinemaId: number;
  selectedFilmIds?: number[];
  planFilms?: PlanFilmProps[];
}

const AddMovies = ({ planCinemaId, selectedFilmIds, planFilms }: AddMoviesProps) => {
  const queryClient = useQueryClient();
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["movies", debouncedSearch],
      queryFn: ({ pageParam = 1 }) => {
        const query = queryString.stringify(
          {
            current: pageParam,
            pageSize: 20,
            sort: "filmName",
            filter: debouncedSearch
              ? JSON.stringify({ filmName: { like: `%${debouncedSearch}%` } })
              : undefined,
          },
          { skipEmptyString: true, skipNull: true, encode: true }
        );
        return getFilms(query);
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage, pages) => {
        const currentPage = pages.length;
        return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
      },
    });

  const films = data?.pages.flatMap((page) => page.data) ?? [];

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchValue]);

  const [open, setOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [state, action, pending] = useActionState(
    addPlanFilmAction,
    INITIAL_STATE
  );

  const preselectedFilmIds = useMemo(
    () => new Set(selectedFilmIds ?? []),
    [selectedFilmIds]
  );

  const columns = useMemo(
    () =>
      getMovieColumns({
        isRowDisabled: (film) => preselectedFilmIds.has(film.id),
        isRowPreselected: (film) => preselectedFilmIds.has(film.id),
      }),
    [preselectedFilmIds]
  );

  const handleSubmit = (): void => {
    // Films picked in this modal
    const newlySelectedFilms = Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((rowId, index) => {
        const film = films.find((item) => item.id.toString() === rowId);
        return film
          ? {
              filmId: film.id,
              planCinemaId: planCinemaId,
              order: index,
            }
          : null;
      })
      .filter(Boolean) as {
      filmId: number;
      planCinemaId: number;
      order: number;
    }[];

    // Existing films already in plan (kept for ordering)
    const existingFilms =
      planFilms
        ?.sort((a, b) => a.order - b.order)
        .map((item) => ({
          filmId: item.filmId,
          planCinemaId,
          order: item.order,
        })) ?? [];

    const combinedFilms = [...existingFilms, ...newlySelectedFilms].map(
      (film, idx) => ({ ...film, order: idx })
    );

    if (combinedFilms.length === 0) {
      toast.error("Vui lòng chọn ít nhất một phim");
      return;
    }

    const formData = new FormData();
    formData.append("selectedFilms", JSON.stringify(combinedFilms));

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
        setSearchValue("");
        setDebouncedSearch("");
      });
    }
  }, [state, queryClient]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setRowSelection({});
      setSearchValue("");
      setDebouncedSearch("");
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

        <div className="px-6 py-5 space-y-4">
          <Input
            placeholder="Tìm kiếm phim..."
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
          <DataTable
            columns={columns}
            data={films}
            loading={isLoading}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            getRowId={(row) => row.id.toString()}
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
