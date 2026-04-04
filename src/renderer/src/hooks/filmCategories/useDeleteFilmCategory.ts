import { filmCategoriesApi } from "@renderer/api/filmCategories.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { filmCategoriesKeys } from "./keys";

export const useDeleteFilmCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: filmCategoriesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: filmCategoriesKeys.all
      });
    }
  });
};
