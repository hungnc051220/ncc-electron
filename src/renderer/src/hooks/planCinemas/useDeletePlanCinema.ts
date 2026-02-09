import { planCinemasApi } from "@renderer/api/planCinemas.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planCinemasKeys } from "./keys";

export const useDeletePlanCinema = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: planCinemasApi.delete,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: planCinemasKeys.all
      });
    }
  });
};
