import { invoicesApi } from "@renderer/api/invoice.api";
import { useQuery } from "@tanstack/react-query";
import { invoicesKeys } from "./keys";

export const useInvoiceDetail = (id: number) =>
  useQuery({
    queryKey: invoicesKeys.getDetail(id),
    queryFn: () => invoicesApi.getDetail(id),
    enabled: !!id
  });
