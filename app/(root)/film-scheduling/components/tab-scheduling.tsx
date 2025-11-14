import { Button } from "@/components/ui/button";
import { columns } from "./tab-scheduling/columns";
import { DataTable } from "./tab-scheduling/data-table";
import { useQuery } from "@tanstack/react-query";
import { getPlanScreenings } from "@/data/loaders";
import queryString from "query-string";

interface TabSchedulingProps {
  planCinemaId?: number;
}

const TabScheduling = ({ planCinemaId }: TabSchedulingProps) => {
  const { isPending, data } = useQuery({
    queryKey: ["plan-screenings", planCinemaId],
    queryFn: () => {
      const query = queryString.stringify(
        { filter: JSON.stringify({ planCinemaId }) },
        { skipEmptyString: true, skipNull: true }
      );
      return getPlanScreenings(query);
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

        <Button>Thêm ca chiếu mới</Button>
      </div>

      <div className="mt-2">
        <DataTable columns={columns} data={data.data} loading={isPending} />
      </div>
    </div>
  );
};

export default TabScheduling;
