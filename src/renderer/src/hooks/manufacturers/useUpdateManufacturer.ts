import { ManufacturerDto, manufacturersApi } from "@renderer/api/manufacturers.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { manufacturersKeys } from "./keys";

export const useUpdateManufacturer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: ManufacturerDto }) =>
      manufacturersApi.update(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: manufacturersKeys.all
      });
    }
  });
};
