import { machineSerialsApi, MachineSerialsQuery } from "@renderer/api/machineSerials.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const useMachineSerials = (params: MachineSerialsQuery) =>
  useQuery({
    queryKey: ["machine-serials", params],
    queryFn: () => machineSerialsApi.getAll(params),
    placeholderData: keepPreviousData,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always"
  });
