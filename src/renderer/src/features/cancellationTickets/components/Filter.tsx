"use client";

import { FilterOutlined } from "@ant-design/icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { TimeRangePickerProps } from "antd";
import { Button, DatePicker, Form, Modal, Select } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { ValuesProps } from "../CancellationTicketsPage";
import { filterEmptyValues } from "@renderer/lib/utils";
import { useDebounce } from "@renderer/hooks/useDebounce";
import { usersApi } from "@renderer/api/users.api";
import { filmsApi } from "@renderer/api/films.api";

const { RangePicker } = DatePicker;

const rangePresets: TimeRangePickerProps["presets"] = [
  { label: "7 ngày trước", value: [dayjs().add(-7, "d"), dayjs()] },
  { label: "14 ngày trước", value: [dayjs().add(-14, "d"), dayjs()] },
  { label: "30 ngày trước", value: [dayjs().add(-30, "d"), dayjs()] },
  { label: "90 ngày trước", value: [dayjs().add(-90, "d"), dayjs()] }
];

interface FilterProps {
  onSearch: (values: ValuesProps) => void;
  filterValues: ValuesProps;
  setCurrent: (page: number) => void;
}

const Filter = ({ onSearch, filterValues, setCurrent }: FilterProps) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState<string | undefined>(undefined);
  const [searchTextUser, setSearchTextUser] = useState<string | undefined>(undefined);
  const debouncedSearch = useDebounce(searchText, 300);
  const debouncedSearchUser = useDebounce(searchTextUser, 300);

  const {
    data: films,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching
  } = useInfiniteQuery({
    queryKey: ["movies", debouncedSearch],
    queryFn: ({ pageParam = 1 }) => {
      return filmsApi.getAll({ current: pageParam, pageSize: 20, filmName: debouncedSearch });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  const {
    data: users,
    fetchNextPage: fetchNextPageUsers,
    hasNextPage: hasNextPageUsers,
    isFetching: isFetchingUsers,
    isFetchingNextPage: isFetchingNextPageUsers
  } = useInfiniteQuery({
    queryKey: ["users", debouncedSearchUser],
    queryFn: ({ pageParam = 1 }) =>
      usersApi.getAll({
        current: pageParam,
        pageSize: 100,
        keyword: debouncedSearchUser
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  const userOptions = useMemo(() => {
    const userOpts =
      users?.pages.flatMap((page) =>
        page.data.map((user) => ({
          value: user.id.toString(),
          label:
            user.customerFirstName && user.customerLastName
              ? `${user.customerFirstName} ${user.customerLastName}`
              : user.username
        }))
      ) ?? [];

    return userOpts;
  }, [users]);

  const filmOptions = useMemo(() => {
    const filmOpts =
      films?.pages.flatMap((page) =>
        page.data.map((film) => ({
          value: film.id,
          label: film.filmName
        }))
      ) ?? [];

    return filmOpts;
  }, [films]);

  const onClear = () => {
    setOpen(false);
    setCurrent(1);
    setSearchText(undefined);
    setSearchTextUser(undefined);
    form.resetFields();
    onSearch({});
  };

  const isEmptyFilter =
    Object.keys(filterEmptyValues(filterValues as Record<string, unknown>)).length === 0;

  return (
    <>
      <div className="relative">
        <Button variant="outlined" icon={<FilterOutlined />} onClick={() => setOpen(true)}>
          Bộ lọc
        </Button>
        {!isEmptyFilter && (
          <div className="absolute size-3 -right-1 -top-1">
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex size-3 rounded-full bg-primary"></span>
            </span>
          </div>
        )}
      </div>
      <Modal
        title="Bộ lọc"
        open={open}
        okText="Tìm kiếm"
        okButtonProps={{ htmlType: "submit", autoFocus: true }}
        onCancel={() => setOpen(false)}
        modalRender={(dom) => (
          <Form
            layout="vertical"
            form={form}
            name="filter-form"
            onFinish={(values) => {
              setOpen(false);
              setCurrent(1);
              onSearch(values);
            }}
          >
            {dom}
          </Form>
        )}
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            <CancelBtn />
            <Button onClick={onClear}>Xóa bộ lọc</Button>
            <OkBtn />
          </>
        )}
      >
        <Form.Item name="filmId" label="Phim">
          <Select
            showSearch={{
              filterOption: false,
              onSearch: (value) => setSearchText(value)
            }}
            options={filmOptions}
            placeholder="Chọn phim"
            allowClear
            loading={isFetching}
            onPopupScroll={(e) => {
              const target = e.target as HTMLElement;
              if (
                hasNextPage &&
                !isFetchingNextPage &&
                target.scrollHeight - target.scrollTop <= target.clientHeight + 50
              ) {
                fetchNextPage();
              }
            }}
          />
        </Form.Item>
        <Form.Item name="userId" label="Người hủy">
          <Select
            options={userOptions}
            placeholder="Chọn người hủy"
            showSearch={{
              filterOption: false,
              onSearch: (value) => setSearchTextUser(value)
            }}
            allowClear
            loading={isFetchingUsers}
            onPopupScroll={(e) => {
              const target = e.target as HTMLElement;
              if (
                hasNextPageUsers &&
                !isFetchingNextPageUsers &&
                target.scrollHeight - target.scrollTop <= target.clientHeight + 50
              ) {
                fetchNextPageUsers();
              }
            }}
          />
        </Form.Item>
        <Form.Item name="dateRange" label="Ngày hủy">
          <RangePicker format="DD/MM/YYYY" presets={rangePresets} className="w-full" />
        </Form.Item>
      </Modal>
    </>
  );
};

export default Filter;
