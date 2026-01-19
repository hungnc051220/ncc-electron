"use client";

import { Dialog } from "@/components/ui/dialog";
import Icon from "@ant-design/icons";
import { Button, Form, Modal, Select } from "antd";
import { FilterIcon } from "lucide-react";
import { useState } from "react";
import { ValuesProps } from "./revenue-by-film";

interface FilterProps {
  onSearch: (values: ValuesProps) => void;
  filterValues: ValuesProps;
}

const Filter = ({ onSearch, filterValues }: FilterProps) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);

  const onClear = () => {
    setOpen(false);
    form.resetFields();
    onSearch({});
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
        <Form.Item name="roleId" label="Nhân viên">
          <Select options={[]} placeholder="Chọn nhân viên" />
        </Form.Item>

        <Form.Item name="roleId" label="Hãng phim">
          <Select options={[]} placeholder="Chọn hãng phim" />
        </Form.Item>
        <Form.Item name="roleId" label="Phim">
          <Select options={[]} placeholder="Chọn phim" />
        </Form.Item>
      </Modal>
    </Dialog>
  );
};

export default Filter;
