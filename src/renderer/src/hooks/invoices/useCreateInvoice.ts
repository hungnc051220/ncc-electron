import { invoicesApi } from "@renderer/api/invoice.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesKeys } from "./keys";

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: invoicesApi.create,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: invoicesKeys.all
      });
    }
  });
};
