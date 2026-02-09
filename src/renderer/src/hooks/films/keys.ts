import { FilmsQuery } from "@renderer/api/films.api";

export const filmsKey = {
  all: ["films"] as const,
  getAll: (params: FilmsQuery) => ["films", params] as const,
  getDetail: (id: number) => ["film", id] as const
};
