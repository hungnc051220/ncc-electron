import { planScreeningsApi } from "@renderer/api/planScreenings.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planScreeningsKeys } from "./keys";

export const useCreatePlanScreening = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: planScreeningsApi.create,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: planScreeningsKeys.all
      });
    }
  });
};
