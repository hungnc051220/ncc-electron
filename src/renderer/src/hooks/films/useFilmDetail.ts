import { filmsApi } from "@renderer/api/films";
import { useQuery } from "@tanstack/react-query";
import { filmsKey } from "./keys";

export const useUserDetail = (id: number) =>
  useQuery({
    queryKey: filmsKey.getDetail(id),
    queryFn: () => filmsApi.getDetail(id)
  });
