import { customerApi } from "@renderer/api/customer.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const useCustomer = (cardCode?: string) =>
  useQuery({
    queryKey: ["customer", cardCode],
    queryFn: () => customerApi.getDetail(cardCode),
    placeholderData: keepPreviousData,
    enabled: !!cardCode
  });
