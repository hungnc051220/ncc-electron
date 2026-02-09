import { FilmDto, filmsApi } from "@renderer/api/films.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { filmsKey } from "./keys";

export const useUpdateFilm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dto }: { dto: FilmDto }) => filmsApi.update(dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: filmsKey.all
      });
    }
  });
};
