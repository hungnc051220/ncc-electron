import { FilmCategoryDto, filmCategoriesApi } from "@renderer/api/filmCategories.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { filmCategoriesKeys } from "./keys";

export const useUpdateFilmCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: FilmCategoryDto }) =>
      filmCategoriesApi.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: filmCategoriesKeys.all
      });
    }
  });
};
