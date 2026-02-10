"use client";

import { FilterOutlined } from "@ant-design/icons";
import { usersApi } from "@renderer/api/users.api";
import { useDebounce } from "@renderer/hooks/useDebounce";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button, DatePicker, Form, Modal, Select } from "antd";
import dayjs from "dayjs";
import { startTransition, useMemo, useState } from "react";
import { ValuesProps } from ".";

interface FilterProps {
  onSearch: (values: ValuesProps) => void;
  filterValues: ValuesProps;
}

const Filter = ({ onSearch, filterValues }: FilterProps) => {
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

  const onClear = () => {
    setOpen(false);
    startTransition(() => {
      form.resetFields();
      setSearchText("");
      onSearch({
        fromDate: dayjs().startOf("month").format()
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
        <Form.Item name="fromDate" label="Khoảng thời gian">
          <DatePicker picker="month" className="w-full" format="MM/YYYY" />
        </Form.Item>
      </Modal>
    </>
  );
};

export default Filter;
