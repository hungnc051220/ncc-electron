import { planCinemasApi, UpdatePlanCinemaDto } from "@renderer/api/planCinemas.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planCinemasKeys } from "./keys";

export const useUpdatePlanCinema = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdatePlanCinemaDto }) =>
      planCinemasApi.update(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: planCinemasKeys.all
      });
    }
  });
};
