import { getPlanScreenings } from "@/data/loaders";
import { useQuery } from "@tanstack/react-query";
import queryString from "query-string";
import AddScreenings from "./add-scheduling-dialog";
import { columns } from "./columns";
import { DataTable } from "./data-table";

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
      <div className="flex items-center justify-end py-2">
        <AddScreenings planCinemaId={planCinemaId!} />
      </div>

      <div className="mt-2">
        <DataTable columns={columns} data={data.data} loading={isPending} />
      </div>
    </div>
  );
};

export default TabScheduling;
