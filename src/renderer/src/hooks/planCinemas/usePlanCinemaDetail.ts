import { planCinemasApi } from "@renderer/api/planCinemas.api";
import { useQuery } from "@tanstack/react-query";
import { planCinemasKeys } from "./keys";

export const usePlanCinemaDetail = (id: number) =>
  useQuery({
    queryKey: planCinemasKeys.getDetail(id),
    queryFn: () => planCinemasApi.getDetail(id)
  });
