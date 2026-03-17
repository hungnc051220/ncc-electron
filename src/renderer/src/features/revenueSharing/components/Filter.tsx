import { FilterOutlined } from "@ant-design/icons";
import { filmsApi } from "@renderer/api/films.api";
import { manufacturersApi } from "@renderer/api/manufacturers.api";
import { useInfiniteSelectOptions } from "@renderer/hooks/useInfiniteSelectOptions";
import { Button, Form, Modal, Select } from "antd";
import dayjs from "dayjs";
import { startTransition, useState } from "react";
import { ValuesProps } from "../RevenueSharingPage";

interface FilterProps {
  onSearch: (values: ValuesProps) => void;
  filterValues: ValuesProps;
}

const Filter = ({ onSearch, filterValues }: FilterProps) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);

  const manufacturerSelect = useInfiniteSelectOptions({
    queryKey: ["manufacturers"],
    queryFn: ({ pageParam, searchText }) =>
      manufacturersApi.getAll({
        current: pageParam,
        pageSize: 20,
        name: searchText
      }),
    mapOption: (item) => ({
      value: item.id,
      label: item.name
    })
  });

  const filmSelect = useInfiniteSelectOptions({
    queryKey: ["films"],
    queryFn: ({ pageParam, searchText }) =>
      filmsApi.getAll({ current: pageParam, pageSize: 20, filmName: searchText }),
    mapOption: (item) => ({
      value: item.id,
      label: item.filmName
    })
  });

  const onClear = () => {
    setOpen(false);
    startTransition(() => {
      form.resetFields();
      manufacturerSelect.resetSearch();
      filmSelect.resetSearch();
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
              onSearch: manufacturerSelect.onSearch
            }}
            loading={manufacturerSelect.loading}
            options={manufacturerSelect.options}
            placeholder="Chọn hãng phim"
            onPopupScroll={manufacturerSelect.onPopupScroll}
            onClear={manufacturerSelect.onClear}
            allowClear
          />
        </Form.Item>

        <Form.Item name="filmId" label="Phim">
          <Select
            showSearch={{
              filterOption: false,
              onSearch: filmSelect.onSearch
            }}
            loading={filmSelect.loading}
            options={filmSelect.options}
            placeholder="Chọn phim"
            onPopupScroll={filmSelect.onPopupScroll}
            onClear={filmSelect.onClear}
            allowClear
          />
        </Form.Item>
      </Modal>
    </>
  );
};

export default Filter;
