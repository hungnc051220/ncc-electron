import { holidaysApi } from "@renderer/api/holidays.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { holidaysKeys } from "./keys";

export const useCreateHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: holidaysApi.create,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: holidaysKeys.all
      });
    }
  });
};
