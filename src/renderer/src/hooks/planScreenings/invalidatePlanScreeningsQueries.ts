import { QueryClient } from "@tanstack/react-query";
import { planScreeningsKeys } from "./keys";

export const invalidatePlanScreeningsQueries = async (queryClient: QueryClient) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: planScreeningsKeys.all }),
    queryClient.invalidateQueries({ queryKey: planScreeningsKeys.allAvailableDates }),
    queryClient.invalidateQueries({ queryKey: ["plan-screening-by-date"] }),
    queryClient.invalidateQueries({ queryKey: ["plan-screening"] }),
    queryClient.removeQueries({ queryKey: planScreeningsKeys.all })
  ]);
};
