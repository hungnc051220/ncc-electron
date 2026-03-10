import { PlanScreeningDto, planScreeningsApi } from "@renderer/api/planScreenings.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidatePlanScreeningsQueries } from "./invalidatePlanScreeningsQueries";

export const useUpdatePlanScreening = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: PlanScreeningDto }) =>
      planScreeningsApi.update(id, dto),

    onSuccess: () => {
      return invalidatePlanScreeningsQueries(queryClient);
    }
  });
};
