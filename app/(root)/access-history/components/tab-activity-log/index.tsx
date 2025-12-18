"use client";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import CustomDatePicker from "@/components/ui/custom-date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUsers } from "@/data/loaders";
import { useDebounce } from "@/hooks/use-debounce";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import ReactSelect from "react-select";
import { createColumns } from "./columns";

const dataTypes = [
  {
    value: "1",
    label: "Danh mục phim",
  },
  {
    value: "2",
    label: "Danh mục phân loại phim",
  },
  {
    value: "3",
    label: "Danh mục hãng phim",
  },
  {
    value: "4",
    label: "Kế hoạch chiếu phim",
  },
  {
    value: "5",
    label: "Lịch chiếu phim",
  },
  {
    value: "6",
    label: "Khung giờ chiếu",
  },
  {
    value: "7",
    label: "Phòng chiếu",
  },
  {
    value: "8",
    label: "Sơ đồ ghế ngồi",
  },
  {
    value: "9",
    label: "Phân hạng ghế ngồi",
  },
  {
    value: "10",
    label: "Lý do hủy vé",
  },
  {
    value: "11",
    label: "Tài khoản người dùng",
  },
];

const TabActivityLog = () => {
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [toDate, setToDate] = useState<Date | null>(new Date());

  const debouncedSearch = useDebounce(searchText, 300);

  const {
    data: users,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["users", debouncedSearch],
    queryFn: ({ pageParam = 1 }) =>
      getUsers({ page: pageParam, pageSize: 100, searchText: debouncedSearch }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    },
  });

  const options = useMemo(() => {
    return (
      users?.pages.flatMap((page) =>
        page.data.map((user) => ({
          value: user.id,
          label:
            user.customerFirstName && user.customerLastName
              ? `${user.customerFirstName} ${user.customerLastName}`
              : user.username,
        }))
      ) ?? []
    );
  }, [users]);

  const { data } = useQuery({
    queryKey: ["access-history", { page }],
  });

  const columns = useMemo(
    () =>
      createColumns({
        page,
      }),
    [page]
  );

  return (
    <div>
      <div className="flex items-center gap-x-4 gap-y-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="text-sm">Loại dữ liệu</p>
          <Select>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Chọn loại dữ liệu" />
            </SelectTrigger>
            <SelectContent>
              {dataTypes.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm">Người thao tác</p>
          <ReactSelect
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
            placeholder="Nhập tên người dùng"
            className="z-20 w-[250px] text-sm"
            isClearable
          />
        </div>

        <div className="flex items-center gap-2 z-20">
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
            isClearable={false}
          />
        </div>

        <div className="flex items-center gap-2 z-20">
          <p className="text-sm whitespace-nowrap">Đến ngày</p>
          <CustomDatePicker
            selectedDate={toDate}
            onChangeDate={(date) => setToDate(date)}
            className="w-[150px]"
            selectsEnd
            startDate={fromDate}
            endDate={toDate}
            minDate={fromDate || undefined}
            isClearable={false}
          />
        </div>
        <Button variant="outline">Lọc dữ liệu</Button>
      </div>
      <DataTable
        columns={columns}
        data={[]}
        total={0}
        className="max-h-[calc(100vh-260px)]"
      />
    </div>
  );
};

export default TabActivityLog;
