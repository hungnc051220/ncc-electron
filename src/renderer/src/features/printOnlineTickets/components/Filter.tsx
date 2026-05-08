import { FilterOutlined } from "@ant-design/icons";
import { Button, DatePicker, Form, Modal } from "antd";
import { useEffect, useState } from "react";
import { ValuesProps } from "../PrintOnlineTicketsPage";

interface FilterProps {
  onSearch: (values: ValuesProps) => void;
  filterValues: ValuesProps;
  setCurrent: (page: number) => void;
}

const Filter = ({ onSearch, filterValues, setCurrent }: FilterProps) => {
  const [form] = Form.useForm<ValuesProps>();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    form.setFieldsValue(filterValues);
  }, [filterValues, form]);

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
        width={400}
        forceRender
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
      >
        <Form.Item name="projectDate" label="Ngày chiếu">
          <DatePicker className="w-full" format="DD/MM/YYYY" allowClear={false} />
        </Form.Item>
      </Modal>
    </>
  );
};

export default Filter;
