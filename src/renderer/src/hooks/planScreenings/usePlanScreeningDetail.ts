import { planScreeningsApi } from "@renderer/api/planScreenings.api";
import { useQuery } from "@tanstack/react-query";
import { planScreeningsKeys } from "./keys";

export const usePlanScreeningDetail = (id: number, isCustomerMode?: boolean) =>
  useQuery({
    queryKey: planScreeningsKeys.getDetail(id),
    queryFn: () => planScreeningsApi.getDetail(id),
    enabled: !!id && !isCustomerMode
  });
