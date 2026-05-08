import { FilterOutlined } from "@ant-design/icons";
import { rangePresets } from "@renderer/lib/dateRangePresets";
import { useQueryClient } from "@tanstack/react-query";
import { Button, DatePicker, Form, Modal } from "antd";
import dayjs from "dayjs";
import { type Dayjs } from "dayjs";
import { startTransition, useEffect, useState } from "react";
import { ValuesProps } from ".";

const { RangePicker } = DatePicker;

interface FilterProps {
  onSearch: (values: ValuesProps) => void;
  filterValues: ValuesProps;
}

type FormValues = {
  dateRange?: [Dayjs, Dayjs];
};

const Filter = ({ onSearch, filterValues }: FilterProps) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
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
      queryClient.removeQueries({
        queryKey: ["users", "infinite"]
      });
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
        forceRender
        modalRender={(dom) => (
          <Form
            layout="vertical"
            form={form}
            onFinish={(values) => {
              setOpen(false);
              onSearch({
                dateRange:
                  values.dateRange && values.dateRange.length === 2
                    ? [values.dateRange[0].format(), values.dateRange[1].format()]
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
        <Form.Item name="dateRange" label="Khoảng thời gian">
          <RangePicker className="w-full" presets={rangePresets} format="DD/MM/YYYY" />
        </Form.Item>
      </Modal>
    </>
  );
};

export default Filter;
