import { planScreeningsApi } from "@renderer/api/planScreenings.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidatePlanScreeningsQueries } from "./invalidatePlanScreeningsQueries";

export const useDeletePlanScreening = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: planScreeningsApi.delete,

    onSuccess: () => {
      return invalidatePlanScreeningsQueries(queryClient);
    }
  });
};
