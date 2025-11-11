"use client";

import { Button } from "@/components/ui/button";
import { columns } from "./tab-film/columns";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./tab-film/data-table";
import queryString from "query-string";
import { getPlanFilms } from "@/data/loaders-server";

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
        <div className="flex items-center gap-3">
          <p className="text-sm">Đã chọn 0 ca chiếu</p>
          <Button size="sm" variant="outline">
            Xóa ca chiếu
          </Button>
        </div>

        <Button>Thêm phim cho kế hoạch</Button>
      </div>

      <div className="mt-2">
        <DataTable columns={columns} data={data.data} loading={isPending} />
      </div>
    </div>
  );
};

export default TabFilm;
