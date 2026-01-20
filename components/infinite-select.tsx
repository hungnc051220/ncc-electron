"use client";

import { Select, SelectProps, Spin } from "antd";
import { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import { ApiResponse } from "@/types";

interface InfiniteSelectProps<T extends { id: number }>
  extends Omit<SelectProps, "options" | "onPopupScroll"> {
  query: UseInfiniteQueryResult<
    InfiniteData<ApiResponse<T>, unknown>,
    Error
  >;
  getLabel: (item: T) => string;
  getValue: (item: T) => number | string;
  onClear?: () => void;
}

export const InfiniteSelect = <T extends { id: number }>({
  query,
  getLabel,
  getValue,
  onClear,
  ...props
}: InfiniteSelectProps<T>) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    query;

  const options =
    data?.pages
      .flatMap((page: ApiResponse<T>) => page.data)
      .map((item: T) => ({
        label: getLabel(item),
        value: getValue(item),
      })) || [];

  const handlePopupScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isNearBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight < 10;

    if (isNearBottom && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleChange = (value: string | number | null | undefined) => {
    if (value === undefined || value === null) {
      onClear?.();
    }
    props.onChange?.(value);
  };

  return (
    <Select
      {...props}
      onChange={handleChange}
      options={options}
      onPopupScroll={handlePopupScroll}
      notFoundContent={
        isLoading ? <Spin size="small" /> : props.notFoundContent || "Không có dữ liệu"
      }
      filterOption={false}
    />
  );
};


