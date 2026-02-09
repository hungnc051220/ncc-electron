import { holidaysApi } from "@renderer/api/holidays.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { holidaysKeys } from "./keys";

export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: holidaysApi.delete,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: holidaysKeys.all
      });
    }
  });
};
