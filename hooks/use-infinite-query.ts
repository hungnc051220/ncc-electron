"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getUsers, getManufacturers, getFilmsList } from "@/data/loaders";
import { FilmProps, ManufacturerProps, UserProps, ApiResponse } from "@/types";

const ITEMS_PER_PAGE = 20;

export const useInfiniteUsers = (searchText?: string) => {
  return useInfiniteQuery({
    queryKey: ["users", "infinite", searchText],
    queryFn: async ({ pageParam = 1 }) => {
      const response: ApiResponse<UserProps> = await getUsers({
        searchText,
        page: pageParam,
        pageSize: ITEMS_PER_PAGE,
      });
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.current * lastPage.pageSize >= lastPage.total) {
        return undefined;
      }
      return lastPage.current + 1;
    },
    initialPageParam: 1,
  });
};

export const useInfiniteManufacturers = () => {
  return useInfiniteQuery({
    queryKey: ["manufacturers", "infinite"],
    queryFn: async ({ pageParam = 1 }) => {
      const response: ApiResponse<ManufacturerProps> = await getManufacturers({
        page: pageParam,
        pageSize: ITEMS_PER_PAGE,
      });
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.current * lastPage.pageSize >= lastPage.total) {
        return undefined;
      }
      return lastPage.current + 1;
    },
    initialPageParam: 1,
  });
};

export const useInfiniteFilms = (manufacturerId?: number) => {
  return useInfiniteQuery({
    queryKey: ["films", "infinite", manufacturerId],
    queryFn: async ({ pageParam = 1 }) => {
      const response: ApiResponse<FilmProps> = await getFilmsList({
        page: pageParam,
        pageSize: ITEMS_PER_PAGE,
        tabCode: "ALL",
      });
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.current * lastPage.pageSize >= lastPage.total) {
        return undefined;
      }
      return lastPage.current + 1;
    },
    initialPageParam: 1,
  });
};
