"use client";

import { getUsers } from "@/data/loaders";
import { useDebounce } from "@/hooks/use-debounce";
import { AuditLogProps } from "@/types";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { PaginationProps, TableProps, TimeRangePickerProps } from "antd";
import { Button, DatePicker, Select, Table } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import qs from "query-string";
import { useMemo, useState } from "react";

const { RangePicker } = DatePicker;

const rangePresets: TimeRangePickerProps["presets"] = [
  { label: "7 ngày trước", value: [dayjs().add(-7, "d"), dayjs()] },
  { label: "14 ngày trước", value: [dayjs().add(-14, "d"), dayjs()] },
  { label: "30 ngày trước", value: [dayjs().add(-30, "d"), dayjs()] },
  { label: "90 ngày trước", value: [dayjs().add(-90, "d"), dayjs()] },
];

const dataTypes = [
  {
    value: "Order",
    label: "Đơn hàng",
  },
  {
    value: "Film",
    label: "Danh mục phim",
  },
  {
    value: "Category",
    label: "Danh mục phân loại phim",
  },
  {
    value: "Manufacturer",
    label: "Danh mục hãng phim",
  },
  {
    value: "PlanCinema",
    label: "Kế hoạch chiếu phim",
  },
  {
    value: "PlanScreenings",
    label: "Lịch chiếu phim",
  },
  {
    value: "DayPart",
    label: "Khung giờ chiếu",
  },
  {
    value: "Room",
    label: "Phòng chiếu",
  },
  {
    value: "Position",
    label: "Sơ đồ ghế ngồi",
  },
  {
    value: "CancelReason",
    label: "Lý do hủy vé",
  },
  {
    value: "Customer",
    label: "Tài khoản người dùng",
  },
];

const TabActivityLog = () => {
  const [current, setCurrent] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [model, setModel] = useState<string | undefined>(undefined);
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().add(-30, "d"));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());

  const debouncedSearch = useDebounce(searchText, 500);

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

  const {
    data,
    refetch,
    isFetching: isFetchingData,
  } = useQuery({
    queryKey: ["access-history", { current }],
    queryFn: () => {
      const filter: Record<string, unknown> = {};
      if (userId) {
        filter.userId = userId;
      }

      if (model) {
        filter.model = model;
      }

      if (fromDate && toDate) {
        filter.timestamp = {
          between: [fromDate.startOf("day"), toDate.endOf("day")],
        };
      }

      const queryObject: Record<string, unknown> = {
        current,
        pageSize: 100,
        sort: "timestamp.desc",
      };

      if (Object.keys(filter).length > 0) {
        queryObject.filter = JSON.stringify(filter);
      }

      const body = qs.stringify(queryObject, {
        skipEmptyString: true,
        skipNull: true,
        encode: true,
      });

      return fetch("/api/audit-log", {
        method: "POST",
        body,
      }).then((res) => res.json());
    },
    enabled: false,
  });

  const columns: TableProps<AuditLogProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      width: 50,
      align: "center",
      render: (_, __, index) => (current - 1) * 20 + index + 1,
    },
    {
      title: "Dữ liệu",
      dataIndex: "model",
      key: "model",
      render: (model) =>
        dataTypes.find((item) => item.value === model)?.label || model,
    },
    {
      title: "Người tạo",
      dataIndex: "createdBy",
      key: "createdBy",
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
    },
    {
      title: "Người cập nhật",
      dataIndex: "user",
      key: "user",
      render: (_, { user }) => {
        const fullName = [user?.customerFirstName, user?.customerLastName]
          .filter(Boolean)
          .join(" ");
        return fullName || user?.username || "";
      },
    },
    {
      title: "Ngày cập nhật",
      dataIndex: "timestamp",
      key: "timestamp",
      render: (_, { timestamp }) => dayjs(timestamp).format("DD/MM/YYYY HH:mm"),
    },
  ];

  const onChange: PaginationProps["onChange"] = (page) => {
    setCurrent(page);
  };

  const onRangeChange = (dates: null | (Dayjs | null)[]) => {
    if (dates) {
      setFromDate(dates[0]);
      setToDate(dates[1]);
    } else {
      setFromDate(null);
      setToDate(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-x-4 gap-y-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="text-sm">Loại dữ liệu</p>
          <Select
            style={{ width: 220 }}
            value={model}
            onChange={setModel}
            options={dataTypes}
            placeholder="Chọn loại dữ liệu"
            allowClear
          />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm">Người thao tác</p>
          <Select
            showSearch={{
              filterOption: false,
              onSearch: (value) => setSearchText(value),
            }}
            loading={isFetching || isFetchingNextPage}
            style={{ width: 220 }}
            value={userId}
            onChange={setUserId}
            options={options}
            placeholder="Chọn người thao tác"
            onPopupScroll={(e) => {
              const target = e.target as HTMLElement;
              if (
                hasNextPage &&
                !isFetchingNextPage &&
                target.scrollHeight - target.scrollTop <=
                  target.clientHeight + 50
              ) {
                fetchNextPage();
              }
            }}
            allowClear
          />
        </div>

        <div className="flex items-center gap-2 z-20">
          <p className="text-sm whitespace-nowrap">Từ ngày</p>
          <RangePicker
            defaultValue={[fromDate, toDate]}
            format="DD/MM/YYYY"
            onChange={onRangeChange}
            presets={rangePresets}
          />
        </div>

        <Button
          color="primary"
          variant="outlined"
          onClick={() => refetch()}
          disabled={isFetchingData}
        >
          Lọc dữ liệu
        </Button>
      </div>
      <Table
        dataSource={data?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 360px)" }}
        loading={isFetchingData}
        pagination={{
          current,
          onChange,
          total: data?.total || 0,
          size: "middle",
          showSizeChanger: false,
          showTotal: (total) => `Tổng ${total} bản ghi`,
          pageSize: 100,
          hideOnSinglePage: true,
        }}
      />
    </div>
  );
};

export default TabActivityLog;
