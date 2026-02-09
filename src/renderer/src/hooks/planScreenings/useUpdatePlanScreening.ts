import { PlanScreeningDto, planScreeningsApi } from "@renderer/api/planScreenings.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planScreeningsKeys } from "./keys";

export const useUpdatePlanScreening = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: PlanScreeningDto }) =>
      planScreeningsApi.update(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: planScreeningsKeys.all
      });
    }
  });
};
