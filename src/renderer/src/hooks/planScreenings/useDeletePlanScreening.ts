import { planScreeningsApi } from "@renderer/api/planScreenings.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planScreeningsKeys } from "./keys";

export const useDeletePlanScreening = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: planScreeningsApi.delete,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: planScreeningsKeys.all
      });
    }
  });
};
