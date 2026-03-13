import { FilterOutlined } from "@ant-design/icons";
import { filmsApi } from "@renderer/api/films.api";
import { manufacturersApi } from "@renderer/api/manufacturers.api";
import { useDebounce } from "@renderer/hooks/useDebounce";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Form, Modal, Select } from "antd";
import dayjs from "dayjs";
import { startTransition, useMemo, useState } from "react";
import { ValuesProps } from "../RevenueSharingPage";

interface FilterProps {
  onSearch: (values: ValuesProps) => void;
  filterValues: ValuesProps;
}

const Filter = ({ onSearch, filterValues }: FilterProps) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [searchTextManufacturer, setSearchTextManufacturer] = useState<string>("");
  const [searchTextFilm, setSearchTextFilm] = useState<string>("");
  const debouncedSearchManufacturer = useDebounce(searchTextManufacturer, 500);
  const debouncedSearchFilm = useDebounce(searchTextFilm, 500);

  const {
    data: manufacturers,
    fetchNextPage: fetchNextPageManufacturers,
    hasNextPage: hasNextPageManufacturers,
    isFetching: isFetchingManufacturers,
    isFetchingNextPage: isFetchingNextPageManufacturers
  } = useInfiniteQuery({
    queryKey: ["manufacturers", debouncedSearchManufacturer],
    queryFn: ({ pageParam = 1 }) =>
      manufacturersApi.getAll({
        current: pageParam,
        pageSize: 20,
        name: debouncedSearchManufacturer
      }),
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
    queryKey: ["films", debouncedSearchFilm],
    queryFn: ({ pageParam = 1 }) =>
      filmsApi.getAll({ current: pageParam, pageSize: 20, filmName: debouncedSearchFilm }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

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
      setSearchTextManufacturer("");
      setSearchTextFilm("");
      queryClient.removeQueries({
        queryKey: ["users", "infinite"]
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
        <Form.Item name="manufacturerId" label="Hãng phim">
          <Select
            showSearch={{
              filterOption: false,
              onSearch: (value) => setSearchTextManufacturer(value)
            }}
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
            showSearch={{
              filterOption: false,
              onSearch: (value) => setSearchTextFilm(value)
            }}
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
      </Modal>
    </>
  );
};

export default Filter;
