import { manufacturersApi, ManufacturersQuery } from "@renderer/api/manufacturers.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { manufacturersKeys } from "./keys";

export const useManufacturers = (params: ManufacturersQuery) =>
  useQuery({
    queryKey: manufacturersKeys.getAll(params),
    queryFn: () => manufacturersApi.getAll(params),
    placeholderData: keepPreviousData
  });
