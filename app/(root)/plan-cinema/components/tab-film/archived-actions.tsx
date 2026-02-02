"use client";

import { updatePlanCinemaAction } from "@/actions/plan-cinema-actions";
import { CornerUpRight } from "lucide-react";
import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

const ArchivedActions = ({
  planCinemaId,
  clearSelectedPlan,
}: {
  planCinemaId: number;
  clearSelectedPlan: () => void;
}) => {
  const [state, action, pending] = useActionState(
    updatePlanCinemaAction,
    INITIAL_STATE
  );

  const handleApprove = () => {
    const formData = new FormData();
    formData.append("planCinemaId", planCinemaId.toString());
    formData.append("status", "4");
    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    } else if (state.success) {
      clearSelectedPlan();
      toast.success("Cập nhật kế hoạch chiếu phim thành công");
    }
  }, [state, clearSelectedPlan]);

  return (
    <>
      <button
        className="text-xs py-1 px-2 flex items-center gap-1 border border-trunks rounded-sm font-bold hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={handleApprove}
        disabled={pending}
      >
        <CornerUpRight className="size-3" /> Lưu trữ
      </button>
    </>
  );
};

export default ArchivedActions;
