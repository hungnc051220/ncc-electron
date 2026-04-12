import { FilterOutlined } from "@ant-design/icons";
import { usersApi } from "@renderer/api/users.api";
import { useDebounce } from "@renderer/hooks/useDebounce";
import { rangePresets } from "@renderer/lib/dateRangePresets";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button, DatePicker, Form, Modal, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { startTransition, useEffect, useMemo, useState } from "react";
import { dataTypes } from "./accessHistory.constants";

const { RangePicker } = DatePicker;

export interface AccessHistoryFilterValues {
  userId?: number;
  model?: string;
  dateRange?: [string, string];
}

type FormValues = Omit<AccessHistoryFilterValues, "dateRange"> & {
  dateRange?: [Dayjs, Dayjs];
};

interface FilterProps {
  onSearch: (values: AccessHistoryFilterValues) => void;
  filterValues: AccessHistoryFilterValues;
}

const Filter = ({ onSearch, filterValues }: FilterProps) => {
  const [form] = Form.useForm<FormValues>();
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 500);

  const {
    data: users,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["access-history-users", debouncedSearch],
    queryFn: ({ pageParam = 1 }) =>
      usersApi.getAll({ current: pageParam, pageSize: 20, keyword: debouncedSearch }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  const userOptions = useMemo(
    () =>
      users?.pages.flatMap((page) =>
        page.data.map((user) => ({
          value: user.id,
          label:
            [user.customerFirstName, user.customerLastName]
              .filter((value): value is string => !!value?.trim())
              .join(" ") || user.username
        }))
      ) ?? [],
    [users]
  );

  useEffect(() => {
    form.setFieldsValue({
      ...filterValues,
      dateRange:
        filterValues.dateRange?.length === 2
          ? [dayjs(filterValues.dateRange[0]), dayjs(filterValues.dateRange[1])]
          : undefined
    });
  }, [filterValues, form]);

  const onClear = () => {
    setOpen(false);
    startTransition(() => {
      form.resetFields();
      setSearchText("");
      onSearch({});
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
        width={420}
        modalRender={(dom) => (
          <Form
            layout="vertical"
            form={form}
            onFinish={(values) => {
              setOpen(false);
              onSearch({
                userId: values.userId,
                model: values.model,
                dateRange:
                  values.dateRange && values.dateRange.length === 2
                    ? [
                        values.dateRange[0].startOf("day").toISOString(),
                        values.dateRange[1].endOf("day").toISOString()
                      ]
                    : undefined
              });
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
        <Form.Item name="model" label="Loại dữ liệu">
          <Select options={[...dataTypes]} placeholder="Chọn loại dữ liệu" allowClear />
        </Form.Item>
        <Form.Item name="userId" label="Người thao tác">
          <Select
            showSearch={{
              filterOption: false,
              onSearch: (value) => setSearchText(value)
            }}
            loading={isFetching || isFetchingNextPage}
            options={userOptions}
            placeholder="Chọn người thao tác"
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
        <Form.Item name="dateRange" label="Khoảng thời gian">
          <RangePicker className="w-full" presets={rangePresets} format="DD/MM/YYYY" />
        </Form.Item>
      </Modal>
    </>
  );
};

export default Filter;
