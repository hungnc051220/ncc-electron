import { FilterOutlined } from "@ant-design/icons";
import { Button, DatePicker, Form, Input, Modal, Select } from "antd";
import { useState } from "react";
import { ValuesProps } from "../FilmsPage";
import { ManufacturerProps } from "@renderer/types";
import { filterEmptyValues } from "@renderer/lib/utils";

interface FilterProps {
  onSearch: (values: ValuesProps) => void;
  filterValues: ValuesProps;
  setCurrent: (page: number) => void;
  manufacturers: ManufacturerProps[];
}

const Filter = ({ onSearch, filterValues, setCurrent, manufacturers }: FilterProps) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);

  const onClear = () => {
    setOpen(false);
    setCurrent(1);
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
              console.log(values);
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
        <Form.Item name="filmName" label="Tên phim">
          <Input placeholder="Nhập tên phim" />
        </Form.Item>
        <Form.Item name="manufacturerId" label="Hãng phát hành">
          <Select
            options={manufacturers.map((m) => ({ label: m.name, value: m.id }))}
            placeholder="Chọn hãng phát hành"
            allowClear
          />
        </Form.Item>
        <Form.Item name="premieredDay" label="Ngày khởi chiếu">
          <DatePicker className="w-full" format="DD/MM/YYYY" />
        </Form.Item>
      </Modal>
    </>
  );
};

export default Filter;
