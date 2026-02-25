import { planFilmsApi } from "@renderer/api/planFilm.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planFilmsKeys } from "./keys";

export const useCreatePlanFilm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: planFilmsApi.create,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: planFilmsKeys.all
      });
    }
  });
};
