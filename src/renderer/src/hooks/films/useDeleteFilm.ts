import { filmsApi } from "@renderer/api/films";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { filmsKey } from "./keys";

export const useDeleteFilm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: filmsApi.delete,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: filmsKey.all
      });
    }
  });
};
