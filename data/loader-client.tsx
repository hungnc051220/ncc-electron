import { ApiResponse, PlanFilmProps } from "@/types";
import qs from "query-string";
import { fetchAPI } from "./fetch-api";

export const getPlanFilms = async (
  planCinemaId?: number
): Promise<ApiResponse<PlanFilmProps>> => {
  const query = qs.stringify(
    {
      filter: JSON.stringify({ planCinemaId }),
      current: 1,
      pageSize: 1000,
    },
    { skipEmptyString: true, skipNull: true, encode: false }
  );
  const url = `/api/pos/plan-film?${query}`;
  return fetchAPI(url, { method: "GET" });
};
