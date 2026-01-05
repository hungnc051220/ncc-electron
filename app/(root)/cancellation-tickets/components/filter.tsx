"use client";

import { Button } from "@/components/ui/button";
import CustomDatePicker from "@/components/ui/custom-date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getFilm, getFilms, getUser, getUsers } from "@/data/loaders";
import { useDebounce } from "@/hooks/use-debounce";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FilterIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { default as qs, default as queryString } from "query-string";
import { useEffect, useMemo, useState, useTransition } from "react";
import Select from "react-select";

interface FilterProps {
  onSearchingChange?: (pending: boolean) => void;
}

const Filter = ({ onSearchingChange }: FilterProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [searchText, setSearchText] = useState<string | undefined>(undefined);
  const [searchTextUser, setSearchTextUser] = useState<string | undefined>(
    undefined
  );
  const [filmId, setFilmId] = useState<string | undefined>(
    searchParams.get("filmId") || undefined
  );
  const [userId, setUserId] = useState<string | undefined>(
    searchParams.get("userId") || undefined
  );
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const debouncedSearch = useDebounce(searchText, 300);
  const debouncedSearchUser = useDebounce(searchTextUser, 300);

  const {
    data: films,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ["movies", debouncedSearch],
    queryFn: ({ pageParam = 1 }) => {
      const query = queryString.stringify(
        {
          current: pageParam,
          pageSize: 20,
          sort: "filmName",
          filter: debouncedSearch
            ? JSON.stringify({ filmName: { like: `%${debouncedSearch}%` } })
            : undefined,
        },
        { skipEmptyString: true, skipNull: true, encode: true }
      );
      return getFilms(query);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    },
  });

  const {
    data: users,
    fetchNextPage: fetchNextPageUsers,
    hasNextPage: hasNextPageUsers,
    isFetching: isFetchingUsers,
    isFetchingNextPage: isFetchingNextPageUsers,
  } = useInfiniteQuery({
    queryKey: ["users", debouncedSearchUser],
    queryFn: ({ pageParam = 1 }) =>
      getUsers({
        page: pageParam,
        pageSize: 100,
        searchText: debouncedSearchUser,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    },
  });

  // Kiểm tra xem filmId có trong danh sách films đã fetch không
  const filmExistsInList = useMemo(() => {
    if (!filmId || !films) return false;
    return films.pages.some((page) =>
      page.data.some((item) => item.id.toString() === filmId)
    );
  }, [filmId, films]);

  // Kiểm tra xem userId có trong danh sách users đã fetch không
  const userExistsInList = useMemo(() => {
    if (!userId || !users) return false;
    return users.pages.some((page) =>
      page.data.some((user) => user.id.toString() === userId)
    );
  }, [userId, users]);

  // Fetch film theo ID nếu có filmId trong URL nhưng chưa có trong danh sách
  const { data: selectedFilm } = useQuery({
    queryKey: ["film", filmId],
    queryFn: () => getFilm(Number(filmId)),
    enabled: !!filmId && !filmExistsInList,
  });

  // Fetch user theo ID nếu có userId trong URL nhưng chưa có trong danh sách
  const { data: selectedUser } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => getUser(Number(userId)),
    enabled: !!userId && !userExistsInList,
  });

  const handleSearch = (clear?: boolean) => {
    const current = qs.parse(searchParams.toString());
    const query = {
      ...current,
      filmId: !clear ? filmId : undefined,
      userId: !clear ? userId : undefined,
      fromDate: !clear
        ? fromDate
          ? format(fromDate, "yyyy-MM-dd")
          : undefined
        : undefined,
      toDate: !clear
        ? toDate
          ? format(toDate, "yyyy-MM-dd")
          : undefined
        : undefined,
      page: 1,
    };

    const url = qs.stringifyUrl(
      {
        url: window.location.href,
        query,
      },
      { skipEmptyString: true, skipNull: true }
    );

    startTransition(() => {
      if (clear) {
        setFilmId(undefined);
        setUserId(undefined);
        setFromDate(null);
        setToDate(null);
      }
      onSearchingChange?.(true);
      router.push(url);
      setOpen(false);
    });
  };

  useEffect(() => {
    if (onSearchingChange) {
      onSearchingChange(isPending);
    }
  }, [isPending, onSearchingChange]);

  const options = useMemo(() => {
    const filmOptions =
      films?.pages.flatMap((page) =>
        page.data.map((item) => ({
          value: item.id.toString(),
          label: item.filmName,
        }))
      ) ?? [];

    // Thêm selectedFilm vào options nếu có và chưa có trong danh sách
    if (
      selectedFilm &&
      !filmOptions.find((opt) => opt.value === selectedFilm.id.toString())
    ) {
      return [
        {
          value: selectedFilm.id.toString(),
          label: selectedFilm.filmName,
        },
        ...filmOptions,
      ];
    }

    return filmOptions;
  }, [films, selectedFilm]);

  const userOptions = useMemo(() => {
    const userOpts =
      users?.pages.flatMap((page) =>
        page.data.map((user) => ({
          value: user.id.toString(),
          label:
            user.customerFirstName && user.customerLastName
              ? `${user.customerFirstName} ${user.customerLastName}`
              : user.username,
        }))
      ) ?? [];

    // Thêm selectedUser vào options nếu có và chưa có trong danh sách
    if (
      selectedUser &&
      !userOpts.find((opt) => opt.value === selectedUser.id.toString())
    ) {
      return [
        {
          value: selectedUser.id.toString(),
          label:
            selectedUser.customerFirstName && selectedUser.customerLastName
              ? `${selectedUser.customerFirstName} ${selectedUser.customerLastName}`
              : selectedUser.username,
        },
        ...userOpts,
      ];
    }

    return userOpts;
  }, [users, selectedUser]);

  // Tìm option đã chọn cho phim
  const selectedFilmOption = useMemo(() => {
    if (!filmId) return null;
    return options.find((option) => option.value === filmId) || null;
  }, [filmId, options]);

  // Tìm option đã chọn cho user
  const selectedUserOption = useMemo(() => {
    if (!userId) return null;
    return userOptions.find((option) => option.value === userId) || null;
  }, [userId, userOptions]);

  // Sync state với URL params khi component mount hoặc URL thay đổi
  useEffect(() => {
    const urlFilmId = searchParams.get("filmId") || undefined;
    const urlUserId = searchParams.get("userId") || undefined;
    const urlFromDate = searchParams.get("fromDate");
    const urlToDate = searchParams.get("toDate");

    if (urlFilmId !== filmId) {
      setFilmId(urlFilmId);
    }
    if (urlUserId !== userId) {
      setUserId(urlUserId);
    }

    const parsedFromDate = urlFromDate ? new Date(urlFromDate) : null;
    const parsedToDate = urlToDate ? new Date(urlToDate) : null;

    if (
      parsedFromDate &&
      (!fromDate || parsedFromDate.getTime() !== fromDate.getTime())
    ) {
      setFromDate(parsedFromDate);
    } else if (!urlFromDate && fromDate) {
      setFromDate(null);
    }

    if (
      parsedToDate &&
      (!toDate || parsedToDate.getTime() !== toDate.getTime())
    ) {
      setToDate(parsedToDate);
    } else if (!urlToDate && toDate) {
      setToDate(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FilterIcon className="size-4" />
          Bộ lọc
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="border-b">
          <DialogTitle>Bộ lọc</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 p-5">
          <div className="w-full">
            <p className="text-sm mb-1">Tên phim</p>
            <Select
              value={selectedFilmOption}
              onChange={(option) => {
                setFilmId(option ? option.value : undefined);
              }}
              options={options}
              isLoading={isFetching}
              onInputChange={(value, action) => {
                if (
                  action.action === "input-change" ||
                  action.action === "menu-close"
                ) {
                  setSearchText(value);
                }
              }}
              onMenuScrollToBottom={() => {
                if (hasNextPage && !isFetchingNextPage) {
                  fetchNextPage();
                }
              }}
              filterOption={null}
              loadingMessage={() => "Đang tải dữ liệu..."}
              noOptionsMessage={() => "Không có kết quả"}
              placeholder="Nhập tên phim"
              className="text-sm"
              isClearable
            />
          </div>

          <div className="w-full">
            <p className="text-sm mb-1">Người hủy</p>
            <Select
              value={selectedUserOption}
              onChange={(option) => {
                setUserId(option ? option.value : undefined);
              }}
              options={userOptions}
              isLoading={isFetchingUsers}
              onInputChange={(value, action) => {
                if (
                  action.action === "input-change" ||
                  action.action === "menu-close"
                ) {
                  setSearchTextUser(value);
                }
              }}
              onMenuScrollToBottom={() => {
                if (hasNextPageUsers && !isFetchingNextPageUsers) {
                  fetchNextPageUsers();
                }
              }}
              filterOption={null}
              loadingMessage={() => "Đang tải dữ liệu..."}
              noOptionsMessage={() => "Không có kết quả"}
              placeholder="Nhập tên người hủy"
              className="text-sm"
              isClearable
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-2">
              <p className="text-sm whitespace-nowrap">Từ ngày</p>
              <CustomDatePicker
                selectedDate={fromDate}
                onChangeDate={(date) => {
                  setFromDate(date);
                  setToDate(null);
                }}
                className="w-[150px]"
                selectsStart
                startDate={fromDate}
                endDate={toDate}
              />
            </div>

            <div className="flex items-center gap-2">
              <p className="text-sm whitespace-nowrap">Đến ngày</p>
              <CustomDatePicker
                selectedDate={toDate}
                onChangeDate={(date) => setToDate(date)}
                className="w-[150px]"
                selectsEnd
                startDate={fromDate}
                endDate={toDate}
                minDate={fromDate || undefined}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex">
          <Button
            disabled={isPending}
            onClick={() => handleSearch(true)}
            className="flex-1"
            variant="outline"
          >
            Xóa bộ lọc
          </Button>
          <Button
            disabled={isPending}
            onClick={() => handleSearch()}
            className="flex-1"
          >
            Tìm kiếm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Filter;
