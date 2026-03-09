import { invoicesApi, UpdateStatusInvoiceDto } from "@renderer/api/invoice.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesKeys } from "./keys";

export const useUpdateStatusInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateStatusInvoiceDto }) =>
      invoicesApi.updateStatus(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: invoicesKeys.all
      });
    }
  });
};
