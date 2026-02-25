import Icon from "@ant-design/icons";
import { Button, DatePicker, Form, Modal } from "antd";
import dayjs from "dayjs";
import { FilterIcon } from "lucide-react";
import { startTransition, useState } from "react";
import { ValuesProps } from ".";

interface FilterProps {
  onSearch: (values: ValuesProps) => void;
  filterValues: ValuesProps;
}

const Filter = ({ onSearch, filterValues }: FilterProps) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);

  const onClear = () => {
    setOpen(false);
    startTransition(() => {
      form.resetFields();
      onSearch({
        fromDate: dayjs().startOf("quarter").format()
      });
    });
  };

  const isEmptyFilter = Object.keys(filterValues).length === 0;

  return (
    <>
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
        width={400}
        modalRender={(dom) => (
          <Form
            layout="vertical"
            form={form}
            initialValues={{ fromDate: dayjs() }}
            onFinish={(values) => {
              const { fromDate } = values;
              setOpen(false);
              onSearch({
                fromDate: dayjs(fromDate).startOf("quarter").format()
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
        <Form.Item name="fromDate" label="Khoảng thời gian">
          <DatePicker picker="quarter" className="w-full" allowClear={false} />
        </Form.Item>
      </Modal>
    </>
  );
};

export default Filter;
