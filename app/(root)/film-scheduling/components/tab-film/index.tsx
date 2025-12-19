"use client";

import { deletePlanFilmAction } from "@/actions/plan-cinema-actions";
import { Button } from "@/components/ui/button";
import { getPlanFilms } from "@/data/loaders";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import queryString from "query-string";
import { startTransition, useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import AddMovies from "./add-movies";
import FilmTable from "./film-table";

interface TabFilmProps {
  planCinemaId?: number;
}

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

const TabFilm = ({ planCinemaId }: TabFilmProps) => {
  const queryClient = useQueryClient();
  const [selectedFilmIds, setSelectedFilmIds] = useState<number[]>([]);
  const [deleteState, deleteAction, pendingDelete] = useActionState(
    deletePlanFilmAction,
    INITIAL_STATE
  );

  const { isPending, data } = useQuery({
    queryKey: ["plan-film", planCinemaId],
    queryFn: () => {
      const query = queryString.stringify(
        {
          filter: JSON.stringify({ planCinemaId }),
          current: 1,
          pageSize: 100,
          sort: "order",
        },
        { skipEmptyString: true, skipNull: true }
      );
      return getPlanFilms(query);
    },
    enabled: !!planCinemaId,
  });

  useEffect(() => {
    if (deleteState.error) {
      toast.error(deleteState.error);
    }

    if (deleteState.success) {
      toast.success("Xóa phim khỏi kế hoạch thành công");
      queryClient.invalidateQueries({ queryKey: ["plan-film"] });
    }
  }, [deleteState, queryClient]);

  if (!data) return null;

  const handleDeleteFilms = () => {
    const allFilms = data.data;
    const selectedFilms = allFilms.filter((item) =>
      selectedFilmIds.includes(item.filmId)
    );

    if (!selectedFilms.length) {
      toast.error("Vui lòng chọn ít nhất một phim");
      return;
    }

    
    const formData = new FormData();
    formData.append("selectedFilms", JSON.stringify(selectedFilms));
    
    startTransition(() => {
      deleteAction(formData);
      setSelectedFilmIds([]);
    });
  };

  return (
    <div className="pt-2 flex flex-col h-full">
      <div className="flex items-center justify-between py-2 shrink-0">
        <div className="flex items-center gap-3">
          <p className="text-sm">
            Đã chọn <b>{selectedFilmIds.length}</b> phim
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={pendingDelete || selectedFilmIds.length === 0}
            onClick={handleDeleteFilms}
          >
            {pendingDelete ? "Đang xóa..." : "Xóa phim"}
          </Button>
        </div>
        <AddMovies
          planCinemaId={planCinemaId!}
          selectedFilmIds={data.data.map((item) => item.filmId)}
          planFilms={data.data}
        />
      </div>

      <div className="pt-2 flex-1 min-h-0">
        <FilmTable
          key={JSON.stringify(data.data)}
          initialData={data.data}
          isPending={isPending}
          selectedFilmIds={selectedFilmIds}
          onSelectedChange={setSelectedFilmIds}
        />
      </div>
    </div>
  );
};

export default TabFilm;
