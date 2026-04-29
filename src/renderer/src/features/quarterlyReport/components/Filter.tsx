import { FilterOutlined } from "@ant-design/icons";
import { Button, DatePicker, Form, Modal } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { startTransition, useEffect, useState } from "react";
import { QuarterlyReportFilterValues } from "../types";
import { formatQuarterLabel } from "../utils";

interface FilterProps {
  onSearch: (values: QuarterlyReportFilterValues) => void;
  filterValues: QuarterlyReportFilterValues;
}

const formatQuarter = (value: Dayjs) => formatQuarterLabel(value.format());

const Filter = ({ onSearch, filterValues }: FilterProps) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      fromDate: filterValues.fromDate ? dayjs(filterValues.fromDate) : undefined,
      compareDate: filterValues.compareDate ? dayjs(filterValues.compareDate) : undefined
    });
  }, [filterValues, form]);

  const onClear = () => {
    setOpen(false);
    startTransition(() => {
      form.resetFields();
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
        width={400}
        modalRender={(dom) => (
          <Form
            layout="vertical"
            form={form}
            onFinish={(values) => {
              const { compareDate, fromDate } = values;
              setOpen(false);
              onSearch({
                fromDate: fromDate ? dayjs(fromDate).startOf("quarter").format() : undefined,
                compareDate:
                  fromDate && compareDate
                    ? dayjs(compareDate).startOf("quarter").format()
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
        <Form.Item name="fromDate" label="Thời gian">
          <DatePicker
            picker="quarter"
            className="w-full"
            allowClear
            format={formatQuarter}
            inputReadOnly
          />
        </Form.Item>
        <Form.Item name="compareDate" label="Quý so sánh">
          <DatePicker
            picker="quarter"
            className="w-full"
            allowClear
            format={formatQuarter}
            inputReadOnly
          />
        </Form.Item>
      </Modal>
    </>
  );
};

export default Filter;
