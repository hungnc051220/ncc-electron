import { useDebounce } from "@renderer/hooks/useDebounce";
import { ApiResponse } from "@shared/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { type UIEvent, useEffect, useMemo, useState } from "react";

type SelectOption = {
  value: number | string;
  label: string;
};

interface UseInfiniteSelectOptionsParams<TItem> {
  queryKey: readonly unknown[];
  queryFn: (params: { pageParam: number; searchText: string }) => Promise<ApiResponse<TItem>>;
  mapOption: (item: TItem) => SelectOption;
  debounceMs?: number;
  prefetchAll?: boolean;
}

export const useInfiniteSelectOptions = <TItem>({
  queryKey,
  queryFn,
  mapOption,
  debounceMs = 500,
  prefetchAll = false
}: UseInfiniteSelectOptionsParams<TItem>) => {
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebounce(searchText, debounceMs);

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } = useInfiniteQuery({
    queryKey: [...queryKey, debouncedSearchText],
    queryFn: ({ pageParam = 1 }) => queryFn({ pageParam, searchText: debouncedSearchText }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  const options = useMemo(() => {
    return data?.pages.flatMap((page) => page.data.map(mapOption)) ?? [];
  }, [data, mapOption]);

  const items = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) ?? [];
  }, [data]);

  useEffect(() => {
    if (prefetchAll && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [prefetchAll, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    items,
    options,
    loading: isFetching || isFetchingNextPage,
    onSearch: (value: string) => setSearchText(value),
    onClear: () => setSearchText(""),
    onPopupScroll: (e: UIEvent<HTMLElement>) => {
      const target = e.target as HTMLElement;
      if (
        hasNextPage &&
        !isFetchingNextPage &&
        target.scrollHeight - target.scrollTop <= target.clientHeight + 50
      ) {
        fetchNextPage();
      }
    },
    resetSearch: () => setSearchText("")
  };
};
