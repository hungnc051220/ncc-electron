import { planScreeningsApi } from "@renderer/api/planScreenings.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidatePlanScreeningsQueries } from "./invalidatePlanScreeningsQueries";

export const useCreatePlanScreening = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: planScreeningsApi.create,

    onSuccess: () => {
      return invalidatePlanScreeningsQueries(queryClient);
    }
  });
};
