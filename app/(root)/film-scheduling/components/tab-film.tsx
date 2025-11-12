"use client";

import { Button } from "@/components/ui/button";
import { getPlanFilms } from "@/data/loaders-server";
import { useQuery } from "@tanstack/react-query";
import { RowSelectionState } from "@tanstack/react-table";
import queryString from "query-string";
import { useState } from "react";
import AddMovies from "./tab-film/add-movies";
import { columns } from "./tab-film/columns";
import { DataTable } from "./tab-film/data-table";

interface TabFilmProps {
  planCinemaId?: number;
}

const TabFilm = ({ planCinemaId }: TabFilmProps) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { isPending, data } = useQuery({
    queryKey: ["plan-film", planCinemaId],
    queryFn: () => {
      const query = queryString.stringify(
        {
          filter: JSON.stringify({ planCinemaId }),
          current: 1,
          pageSize: 1000,
        },
        { skipEmptyString: true, skipNull: true }
      );
      return getPlanFilms(query);
    },
    enabled: !!planCinemaId,
  });

  if (!data) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between py-2">
        {Object.keys(rowSelection).length > 0 ? (
          <div className="flex items-center gap-3">
            <p className="text-sm">
              Đã chọn{" "}
              <span className="text-primary font-bold">
                {Object.keys(rowSelection).length}
              </span>{" "}
              phim
            </p>
            <Button size="sm" variant="outline">
              Xóa phim
            </Button>
          </div>
        ) : (
          <div />
        )}

        <AddMovies planCinemaId={planCinemaId!} />
      </div>

      <div className="mt-2">
        <DataTable
          columns={columns}
          data={data.data}
          loading={isPending}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
        />
      </div>
    </div>
  );
};

export default TabFilm;
