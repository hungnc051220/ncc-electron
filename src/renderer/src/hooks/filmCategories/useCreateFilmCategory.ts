import { filmCategoriesApi } from "@renderer/api/filmCategories.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { filmCategoriesKeys } from "./keys";

export const useCreateFilmCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: filmCategoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: filmCategoriesKeys.all
      });
    }
  });
};
