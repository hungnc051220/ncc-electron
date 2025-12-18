"use client";

import { getPlanFilms } from "@/data/loaders";
import { useQuery } from "@tanstack/react-query";
import queryString from "query-string";
import AddMovies from "./add-movies";
import FilmTable from "./film-table";

interface TabFilmProps {
  planCinemaId?: number;
}

const TabFilm = ({ planCinemaId }: TabFilmProps) => {
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

  if (!data) return null;

  return (
    <div className="pt-2 flex flex-col h-full">
      <div className="flex items-center justify-end py-2 shrink-0">
        <AddMovies planCinemaId={planCinemaId!} />
      </div>

      <div className="pt-2 flex-1 min-h-0">
        <FilmTable
          key={JSON.stringify(data.data)}
          initialData={data.data}
          isPending={isPending}
        />
      </div>
    </div>
  );
};

export default TabFilm;
