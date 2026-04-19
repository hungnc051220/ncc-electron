import { FilterOutlined } from "@ant-design/icons";
import { rangePresets } from "@renderer/lib/dateRangePresets";
import { filterEmptyValues } from "@renderer/lib/utils";
import { Button, DatePicker, Form, Modal } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { getDefaultFilterValues, ValuesProps } from "../CancellationTicketsPage";

const { RangePicker } = DatePicker;

interface FilterProps {
  onSearch: (values: ValuesProps) => void;
  filterValues: ValuesProps;
  setCurrent: (page: number) => void;
}

const Filter = ({ onSearch, filterValues, setCurrent }: FilterProps) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      ...filterValues,
      dateRange: filterValues.dateRange?.map((value) => dayjs(value))
    });
  }, [filterValues, form]);

  const onClear = () => {
    const defaultValues = getDefaultFilterValues();
    setOpen(false);
    setCurrent(1);
    form.setFieldsValue({
      dateRange: defaultValues.dateRange?.map((value) => dayjs(value))
    });
    onSearch(defaultValues);
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
        <Form.Item name="dateRange" label="Ngày hủy">
          <RangePicker format="DD/MM/YYYY" presets={rangePresets} className="w-full" />
        </Form.Item>
      </Modal>
    </>
  );
};

export default Filter;
