import { invoicesApi, InvoicesQuery } from "@renderer/api/invoice.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { invoicesKeys } from "./keys";

interface UseInvoicesOptions {
  enabled?: boolean;
}

export const useInvoices = (params: InvoicesQuery, options?: UseInvoicesOptions) =>
  useQuery({
    queryKey: invoicesKeys.getAll(params),
    queryFn: () => invoicesApi.getAll(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled
  });
