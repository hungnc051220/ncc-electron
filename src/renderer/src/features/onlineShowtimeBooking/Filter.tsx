import { FilterOutlined } from "@ant-design/icons";
import { rangePresets } from "@renderer/lib/dateRangePresets";
import { filterEmptyValues } from "@renderer/lib/utils";
import { Button, DatePicker, Form, Modal } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

const { RangePicker } = DatePicker;

export interface OnlineShowtimeBookingFilterValues {
  dateRange?: [Dayjs | null, Dayjs | null];
}

interface FilterProps {
  filterValues: OnlineShowtimeBookingFilterValues;
  onSearch: (values: OnlineShowtimeBookingFilterValues) => void;
  setCurrent: (page: number) => void;
}

const Filter = ({ filterValues, onSearch, setCurrent }: FilterProps) => {
  const [form] = Form.useForm<OnlineShowtimeBookingFilterValues>();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      dateRange: filterValues.dateRange
        ? [filterValues.dateRange[0] ?? null, filterValues.dateRange[1] ?? null]
        : undefined
    });
  }, [filterValues, form]);

  const onClear = () => {
    const defaultValues = {
      dateRange: [dayjs().startOf("day"), dayjs().endOf("day")] as [Dayjs, Dayjs]
    };

    setOpen(false);
    setCurrent(1);
    form.setFieldsValue(defaultValues);
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
          <Form<OnlineShowtimeBookingFilterValues>
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
        width={400}
      >
        <Form.Item<OnlineShowtimeBookingFilterValues> name="dateRange" label="Ngày chiếu">
          <RangePicker
            className="w-full"
            presets={rangePresets}
            format="DD/MM/YYYY"
            allowClear={false}
          />
        </Form.Item>
      </Modal>
    </>
  );
};

export default Filter;
