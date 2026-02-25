import { discountsApi, DiscountsQuery } from "@renderer/api/discounts.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { discountsKeys } from "./keys";

export const useDiscounts = (params: DiscountsQuery) =>
  useQuery({
    queryKey: discountsKeys.getAll(params),
    queryFn: () => discountsApi.getAll(params),
    placeholderData: keepPreviousData
  });
