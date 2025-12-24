import { deleteMultiPlanScreeningAction } from "@/actions/plan-screening-actions";
import { Button } from "@/components/ui/button";
import { getPlanScreenings } from "@/data/loaders";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RowSelectionState } from "@tanstack/react-table";
import queryString from "query-string";
import { startTransition, useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import AddScreenings from "./add-scheduling-dialog";
import { columns } from "./columns";
import { DataTable } from "./data-table";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface TabSchedulingProps {
  planCinemaId?: number;
}

const TabScheduling = ({ planCinemaId }: TabSchedulingProps) => {
  const queryClient = useQueryClient();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const [deleteState, deleteAction, pendingDelete] = useActionState(
    deleteMultiPlanScreeningAction,
    INITIAL_STATE
  );

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

  useEffect(() => {
    if (deleteState.error) {
      toast.error(deleteState.error);
    }

    if (deleteState.success) {
      toast.success("Xóa ca chiếu khỏi kế hoạch thành công");
      queryClient.invalidateQueries({ queryKey: ["plan-screenings"] });
    }
  }, [deleteState, queryClient]);

  if (!data) return null;

  const handleDelete = () => {
    const allPlans = data.data;
    const newlySelectedPlans = Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((rowId) => {
        const plan = allPlans.find((item) => item.id.toString() === rowId);
        return plan ? plan.id : null;
      })
      .filter(Boolean) as number[];

    const formData = new FormData();
    formData.append("planIds", JSON.stringify(newlySelectedPlans));

    startTransition(() => {
      deleteAction(formData);
      setRowSelection({});
    });
  };

  if (!data) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <p className="text-sm">
            Đã chọn <b>{Object.keys(rowSelection).length}</b> ca chiếu
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={pendingDelete || Object.keys(rowSelection).length === 0}
            onClick={handleDelete}
          >
            {pendingDelete ? "Đang xóa..." : "Xóa ca chiếu"}
          </Button>
        </div>
        <AddScreenings planCinemaId={planCinemaId!} />
      </div>

      <div className="mt-2">
        <DataTable
          columns={columns}
          data={data.data}
          loading={isPending}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          getRowId={(row) => row.id.toString()}
        />
      </div>
    </div>
  );
};

export default TabScheduling;
