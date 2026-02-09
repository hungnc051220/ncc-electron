import { manufacturersApi } from "@renderer/api/manufacturers.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { manufacturersKeys } from "./keys";

export const useCreateManufacturer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: manufacturersApi.create,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: manufacturersKeys.all
      });
    }
  });
};
