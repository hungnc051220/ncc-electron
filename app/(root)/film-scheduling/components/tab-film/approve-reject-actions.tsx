"use client";

import { approveRejectPlanCinemaAction } from "@/actions/plan-cinema-actions";
import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

const ApproveRejectActions = ({ planCinemaId }: { planCinemaId: number }) => {
  const [state, action, pending] = useActionState(
    approveRejectPlanCinemaAction,
    INITIAL_STATE
  );

  const handleApprove = (isApproved: boolean) => {
    const formData = new FormData();
    formData.append("planCinemaId", planCinemaId.toString());
    formData.append("isApproved", isApproved.toString());
    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    } else if (state.success) {
      toast.success("Cập nhật kế hoạch chiếu phim thành công");
    }
  }, [state]);

  return (
    <>
      <button
        className="text-xs py-1 px-2 flex items-center gap-1 bg-chichi text-white rounded-sm font-bold hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending}
        onClick={() => handleApprove(false)}
      >
        Không chấp nhận
      </button>
      <button
        className="text-xs py-1 px-2 flex items-center gap-1 bg-hit text-white rounded-sm font-bold hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending}
        onClick={() => handleApprove(true)}
      >
        Chấp nhận
      </button>
    </>
  );
};

export default ApproveRejectActions;
