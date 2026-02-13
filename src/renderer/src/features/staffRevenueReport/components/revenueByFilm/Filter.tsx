// import { InfiniteSelect } from "@/components/infinite-select";
// import {
//   useInfiniteFilms,
//   useInfiniteManufacturers,
//   useInfiniteUsers
// } from "@/hooks/use-infinite-query";
import { FilterOutlined } from "@ant-design/icons";
import { filmsApi } from "@renderer/api/films.api";
import { manufacturersApi } from "@renderer/api/manufacturers.api";
import { usersApi } from "@renderer/api/users.api";
import { useDebounce } from "@renderer/hooks/useDebounce";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { TimeRangePickerProps } from "antd";
import { Button, DatePicker, Form, Modal, Select } from "antd";
import dayjs from "dayjs";
import { startTransition, useMemo, useState } from "react";
import { ValuesProps } from ".";
// import { useDebounce } from "@renderer/hooks/useDebounce";

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
}

const Filter = ({ onSearch, filterValues }: FilterProps) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState<string>("");
  const debouncedSearch = useDebounce(searchText, 500);

  const {
    data: users,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["users", debouncedSearch],
    queryFn: ({ pageParam = 1 }) =>
      usersApi.getAll({ current: pageParam, pageSize: 20, keyword: debouncedSearch }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  const {
    data: manufacturers,
    fetchNextPage: fetchNextPageManufacturers,
    hasNextPage: hasNextPageManufacturers,
    isFetching: isFetchingManufacturers,
    isFetchingNextPage: isFetchingNextPageManufacturers
  } = useInfiniteQuery({
    queryKey: ["manufacturers"],
    queryFn: ({ pageParam = 1 }) => manufacturersApi.getAll({ current: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  const {
    data: films,
    fetchNextPage: fetchNextPageFilms,
    hasNextPage: hasNextPageFilms,
    isFetching: isFetchingFilms,
    isFetchingNextPage: isFetchingNextPageFilms
  } = useInfiniteQuery({
    queryKey: ["films"],
    queryFn: ({ pageParam = 1 }) => filmsApi.getAll({ current: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  const options = useMemo(() => {
    return (
      users?.pages.flatMap((page) =>
        page.data.map((user) => ({
          value: user.id,
          label: user?.customerFirstName || user.username
        }))
      ) ?? []
    );
  }, [users]);

  const manufacturerOptions = useMemo(() => {
    return (
      manufacturers?.pages.flatMap((page) =>
        page.data.map((item) => ({
          value: item.id,
          label: item.name
        }))
      ) ?? []
    );
  }, [manufacturers]);

  const filmOptions = useMemo(() => {
    return (
      films?.pages.flatMap((page) =>
        page.data.map((item) => ({
          value: item.id,
          label: item.filmName
        }))
      ) ?? []
    );
  }, [films]);

  const onClear = () => {
    setOpen(false);
    startTransition(() => {
      form.resetFields();
      // setSearchText("");
      queryClient.removeQueries({
        queryKey: ["users", "infinite"]
      });
      onSearch({
        dateRange: [dayjs().startOf("day").toISOString(), dayjs().endOf("day").toISOString()]
      });
    });
  };

  const isEmptyFilter = Object.keys(filterValues).length === 0;

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
              onSearch(values);
            }}
            initialValues={{
              dateRange: [dayjs(), dayjs()]
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
        <Form.Item name="userId" label="Nhân viên">
          <Select
            showSearch={{
              filterOption: false,
              onSearch: (value) => setSearchText(value)
            }}
            loading={isFetching || isFetchingNextPage}
            options={options}
            placeholder="Chọn nhân viên"
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
            allowClear
          />
        </Form.Item>

        <Form.Item name="manufacturerId" label="Hãng phim">
          <Select
            loading={isFetchingManufacturers || isFetchingNextPageManufacturers}
            options={manufacturerOptions}
            placeholder="Chọn hãng phim"
            onPopupScroll={(e) => {
              const target = e.target as HTMLElement;
              if (
                hasNextPageManufacturers &&
                !isFetchingNextPageManufacturers &&
                target.scrollHeight - target.scrollTop <= target.clientHeight + 50
              ) {
                fetchNextPageManufacturers();
              }
            }}
            allowClear
          />
        </Form.Item>

        <Form.Item name="filmId" label="Phim">
          <Select
            loading={isFetchingFilms || isFetchingNextPageFilms}
            options={filmOptions}
            placeholder="Chọn phim"
            onPopupScroll={(e) => {
              const target = e.target as HTMLElement;
              if (
                hasNextPageFilms &&
                !isFetchingNextPageFilms &&
                target.scrollHeight - target.scrollTop <= target.clientHeight + 50
              ) {
                fetchNextPageFilms();
              }
            }}
            allowClear
          />
        </Form.Item>
        <Form.Item name="dateRange" label="Khoảng thời gian">
          <RangePicker className="w-full" presets={rangePresets} format="DD/MM/YYYY" />
        </Form.Item>
      </Modal>
    </>
  );
};

export default Filter;
