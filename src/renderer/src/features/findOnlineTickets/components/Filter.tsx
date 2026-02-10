"use client";

import { FilterOutlined } from "@ant-design/icons";
import { Button, DatePicker, Form, Input, Modal } from "antd";
import { useState } from "react";
import { ValuesProps } from "../FindOnlineTicketsPage";

const { RangePicker } = DatePicker;

interface FilterProps {
  onSearch: (values: ValuesProps) => void;
  filterValues: ValuesProps;
  setCurrent: (page: number) => void;
}

const Filter = ({ onSearch, filterValues, setCurrent }: FilterProps) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);

  const onClear = () => {
    setOpen(false);
    setCurrent(1);
    form.resetFields();
    onSearch({});
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
        <Form.Item name="id" label="Mã thanh toán">
          <Input placeholder="Nhập mã thanh toán" />
        </Form.Item>
        <Form.Item name="barCode" label="Mã barcode">
          <Input placeholder="Nhập mã barcode" />
        </Form.Item>
        <Form.Item name="phoneNumber" label="Số điện thoại">
          <Input placeholder="Nhập số điện thoại" />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input placeholder="Nhập email" />
        </Form.Item>
        <Form.Item name="dateRange" label="Thời gian mua">
          <RangePicker format="DD/MM/YYYY" className="w-full" />
        </Form.Item>
      </Modal>
    </>
  );
};

export default Filter;
