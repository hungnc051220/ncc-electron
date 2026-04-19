import { FilterOutlined } from "@ant-design/icons";
import VirtualKeyboardDrawer from "@renderer/components/VirtualKeyboardDrawer";
import { useVirtualKeyboard } from "@renderer/hooks/useVirtualKeyboard";
import { Button, DatePicker, Form, Input, Modal } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { getDefaultFilterValues, ValuesProps } from "../FindOnlineTicketsPage";

const { RangePicker } = DatePicker;

interface FilterProps {
  onSearch: (values: ValuesProps) => void;
  filterValues: ValuesProps;
  setCurrent: (page: number) => void;
}

type FilterFormValues = Omit<ValuesProps, "dateRange"> & {
  dateRange?: [Dayjs, Dayjs];
};

const Filter = ({ onSearch, filterValues, setCurrent }: FilterProps) => {
  const [form] = Form.useForm<FilterFormValues>();
  const [open, setOpen] = useState(false);
  const keyboard = useVirtualKeyboard({
    form,
    fields: ["id", "barCode", "phoneNumber", "email"] as const,
    labels: {
      id: "Mã thanh toán",
      barCode: "Mã vé",
      phoneNumber: "Số điện thoại",
      email: "Email"
    },
    onEnter: () => form.submit()
  });

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
      ...defaultValues,
      dateRange: defaultValues.dateRange?.map((value) => dayjs(value))
    });
    onSearch(defaultValues);
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
              onSearch({
                ...values,
                dateRange: values.dateRange?.map((value) => value.toISOString()) as
                  | [string, string]
                  | undefined
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
        <Form.Item name="id" label="Mã thanh toán">
          <Input {...keyboard.bindInput("id")} placeholder="Nhập mã thanh toán" />
        </Form.Item>
        <Form.Item name="barCode" label="Mã vé">
          <Input {...keyboard.bindInput("barCode")} placeholder="Nhập mã vé" />
        </Form.Item>
        <Form.Item name="phoneNumber" label="Số điện thoại">
          <Input {...keyboard.bindInput("phoneNumber")} placeholder="Nhập số điện thoại" />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input {...keyboard.bindInput("email")} placeholder="Nhập email" />
        </Form.Item>
        <Form.Item name="dateRange" label="Thời gian mua">
          <RangePicker format="DD/MM/YYYY" className="w-full" />
        </Form.Item>
      </Modal>

      {open && (
        <VirtualKeyboardDrawer
          open={keyboard.isKeyboardOpen}
          activeFieldLabel={keyboard.activeFieldLabel}
          layoutName={keyboard.layoutName}
          keyboardRef={keyboard.registerKeyboard}
          onClose={() => keyboard.setIsKeyboardOpen(false)}
          onKeyPress={keyboard.handleKeyPress}
        />
      )}
    </>
  );
};

export default Filter;
