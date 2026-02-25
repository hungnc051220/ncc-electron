import { api } from "@renderer/api/client";
import { ApiResponse, FilmProps, UserProps } from "@shared/types";
import queryString from "query-string";

export interface FilmsQuery {
  current: number;
  pageSize: number;
  filmName?: string;
  manufacturerId?: number;
  premieredDay?: string;
  tabCode?: string;
}

export interface FilmDto {
  id?: number;
  filmName: string;
  filmNameEn?: string;
  versionCode?: string;
  manufacturerId?: number;
  countryId?: number;
  premieredDay?: string;
  languageCode?: string;
  duration?: number;
  director?: string;
  actors?: string;
  introduction?: string;
  holding?: string;
  description?: string;
  sellOnline?: boolean;
  metaDescription?: string;
  metaKeyword?: string;
  metaTitle?: string;
  limitedToStores?: boolean;
  subjectToAcl?: boolean;
  published?: boolean;
  deleted?: boolean;
  pictureId?: number;
  imageUrl?: string;
  videoUrl?: string;
  statusCode?: string;
  proposedPrice?: number;
  trailerOnHomePage?: boolean;
  isHot?: boolean;
  showOnHomePage?: boolean;
  ageAbove?: number;
  orderNo?: number;
  sellOnlineBefore?: number;
  isFree?: boolean;
  categoryIds?: number[];
}

export const filmsApi = {
  getAll: async (params: FilmsQuery): Promise<ApiResponse<FilmProps>> => {
    const { current, pageSize, tabCode, filmName, manufacturerId, premieredDay } = params;

    const filter: Record<string, unknown> = {};

    if (filmName) {
      filter.filmName = { like: `%${filmName}%` };
    }

    if (manufacturerId) {
      filter.manufacturerId = manufacturerId;
    }

    if (premieredDay) {
      filter.premieredDay = premieredDay;
    }

    const queryObject: Record<string, unknown> = {
      current,
      pageSize,
      tabCode,
      sort: "createdOnUtc.desc"
    };

    if (Object.keys(filter).length > 0) {
      queryObject.filter = JSON.stringify(filter);
    }

    const query = queryString.stringify(queryObject, {
      skipEmptyString: true,
      skipNull: true
    });

    const res = await api.get(`/api/pos/v1/films?${query}`);

    return res.data;
  },
  getDetail: async (id: number): Promise<UserProps> => {
    const res = await api.get(`/api/pos/v1/films/${id}`);
    return res.data;
  },
  create: async (dto: FilmDto) => {
    const res = await api.post("/api/pos/v1/films", dto);
    return res.data;
  },
  update: async (dto: FilmDto) => {
    const res = await api.put(`/api/pos/v1/films`, dto);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/api/pos/v1/films/${id}`);
    return res.data;
  }
};
