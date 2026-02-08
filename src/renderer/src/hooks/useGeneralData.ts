import { generalDataApi } from "@renderer/api/generalData.api";
import { useQuery } from "@tanstack/react-query";

export const useGeneralData = () =>
  useQuery({
    queryKey: ["generalData"],
    queryFn: generalDataApi.get,
    staleTime: Infinity
  });
