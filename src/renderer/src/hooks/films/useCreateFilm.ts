import { filmsApi } from "@renderer/api/films";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { filmsKey } from "./keys";

export const useCreateFilm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: filmsApi.create,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: filmsKey.all
      });
    }
  });
};
