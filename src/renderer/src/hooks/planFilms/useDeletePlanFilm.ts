import { PlanFilmDto, planFilmsApi } from "@renderer/api/planFilm.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planFilmsKeys } from "./keys";

export const useDeletePlanFilm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dto }: { dto: PlanFilmDto[] }) => planFilmsApi.delete(dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: planFilmsKeys.all
      });
    }
  });
};
