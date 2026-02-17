import { FilterOutlined } from "@ant-design/icons";
import { Button, Form, Input, Modal, Select } from "antd";
import { useState } from "react";
import { CustomerRoleProps } from "@renderer/types";
import { ValuesProps } from "../UsersPage";

interface FilterProps {
  onSearch: (values: ValuesProps) => void;
  filterValues: ValuesProps;
  setCurrent: (page: number) => void;
  customerRoles: CustomerRoleProps[];
}

const Filter = ({ onSearch, filterValues, setCurrent, customerRoles }: FilterProps) => {
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
        <Form.Item name="roleId" label="Nhóm người dùng">
          <Select
            options={customerRoles.map((role) => ({
              value: role.id,
              label: role.name
            }))}
            placeholder="Chọn nhóm người dùng"
          />
        </Form.Item>
        <Form.Item name="keyword" label="Tên/Email">
          <Input placeholder="Nhập tên/email" />
        </Form.Item>
      </Modal>
    </>
  );
};

export default Filter;
