import { InvoiceDto, invoicesApi } from "@renderer/api/invoice.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesKeys } from "./keys";

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: InvoiceDto }) => invoicesApi.update(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: invoicesKeys.all
      });
    }
  });
};
