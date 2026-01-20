"use client";

import { Dialog } from "@/components/ui/dialog";
import Icon from "@ant-design/icons";
import { Button, Form, Modal, DatePicker } from "antd";
import { FilterIcon } from "lucide-react";
import { startTransition, useState, useEffect } from "react";
import { ValuesProps } from ".";
import dayjs from "dayjs";
import type { TimeRangePickerProps } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { InfiniteSelect } from "@/components/infinite-select";
import {
  useInfiniteUsers,
  useInfiniteManufacturers,
  useInfiniteFilms,
} from "@/hooks/use-infinite-query";
import { useDebounce } from "@/hooks/use-debounce";
import { UserProps, ManufacturerProps, FilmProps } from "@/types";

const { RangePicker } = DatePicker;

const rangePresets: TimeRangePickerProps["presets"] = [
  { label: "7 ngày trước", value: [dayjs().add(-7, "d"), dayjs()] },
  { label: "14 ngày trước", value: [dayjs().add(-14, "d"), dayjs()] },
  { label: "30 ngày trước", value: [dayjs().add(-30, "d"), dayjs()] },
  { label: "90 ngày trước", value: [dayjs().add(-90, "d"), dayjs()] },
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
  const debouncedSearchText = useDebounce(searchText, 500);
  const usersQuery = useInfiniteUsers(debouncedSearchText);
  const manufacturersQuery = useInfiniteManufacturers();
  const filmsQuery = useInfiniteFilms();

  // Reset users query when search is cleared
  useEffect(() => {
    if (debouncedSearchText === "") {
      queryClient.removeQueries({
        queryKey: ["users", "infinite", ""],
      });
    }
  }, [debouncedSearchText, queryClient]);

  const onClear = () => {
    setOpen(false);
    startTransition(() => {
      form.resetFields();
      setSearchText("");
      queryClient.removeQueries({
        queryKey: ["users", "infinite"],
      });
      onSearch({});
    });
  };

  const isEmptyFilter = Object.keys(filterValues).length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="relative">
        <Button
          variant="outlined"
          icon={<Icon component={FilterIcon} />}
          onClick={() => setOpen(true)}
        >
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
          <InfiniteSelect<UserProps>
            query={usersQuery}
            getLabel={(user) => user.customerFirstName}
            getValue={(user) => user.id}
            placeholder="Chọn nhân viên"
            showSearch={{
              onSearch: (value) => setSearchText(value),
            }}
            allowClear
            onClear={() => {
              setSearchText("");
              queryClient.removeQueries({
                queryKey: ["users", "infinite"],
              });
            }}
          />
        </Form.Item>

        <Form.Item name="manufacturerId" label="Hãng phim">
          <InfiniteSelect<ManufacturerProps>
            query={manufacturersQuery}
            getLabel={(manufacturer) => manufacturer.name}
            getValue={(manufacturer) => manufacturer.id}
            placeholder="Chọn hãng phim"
          />
        </Form.Item>
        <Form.Item name="filmId" label="Phim">
          <InfiniteSelect<FilmProps>
            query={filmsQuery}
            getLabel={(film) => film.filmName}
            getValue={(film) => film.id}
            placeholder="Chọn phim"
          />
        </Form.Item>
        <Form.Item name="dateRange" label="Khoảng thời gian">
          <RangePicker
            className="w-full"
            presets={rangePresets}
            format="DD/MM/YYYY"
          />
        </Form.Item>
      </Modal>
    </Dialog>
  );
};

export default Filter;
