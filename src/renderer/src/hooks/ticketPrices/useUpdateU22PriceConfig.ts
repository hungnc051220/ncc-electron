import { u22PriceConfigApi } from "@renderer/api/u22PriceConfig.api";
import type { UpdateU22PriceConfigDto } from "@shared/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketPricesKeys } from "./keys";

export const useUpdateU22PriceConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateU22PriceConfigDto) => u22PriceConfigApi.update(dto),
    onSuccess: (saved) => {
      queryClient.setQueryData(ticketPricesKeys.u22Config, saved);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ticketPricesKeys.u22Config });
    }
  });
};
