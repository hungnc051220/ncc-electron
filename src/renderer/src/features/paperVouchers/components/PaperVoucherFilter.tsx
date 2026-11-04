import { FilterOutlined, SearchOutlined } from "@ant-design/icons";
import { formatMoney } from "@renderer/lib/utils";
import { Badge, Button, Form, Input, Modal, Select } from "antd";
import { useEffect, useState } from "react";
import {
  countPaperVoucherFilters,
  formatPaperVoucherDate,
  PAPER_VOUCHER_NO_EXPIRY_FILTER,
  PAPER_VOUCHER_NO_EXPIRY_LABEL,
  PAPER_VOUCHER_STATUS_OPTIONS,
  type PaperVoucherFilterValues
} from "../paperVoucher.utils";

interface PaperVoucherFilterProps {
  filters: PaperVoucherFilterValues;
  onChange: (filters: PaperVoucherFilterValues) => void;
  faceValues: number[];
  expiryDates: string[];
  hasNoExpiryBatch: boolean;
}

const toFilterValues = (values: PaperVoucherFilterValues): PaperVoucherFilterValues => ({
  keyword: values.keyword?.trim() || undefined,
  faceValue: values.faceValue ?? undefined,
  status: values.status || undefined,
  expiresAt: values.expiresAt || undefined
});

const PaperVoucherFilter = ({
  filters,
  onChange,
  faceValues,
  expiryDates,
  hasNoExpiryBatch
}: PaperVoucherFilterProps) => {
  const [form] = Form.useForm<PaperVoucherFilterValues>();
  const [open, setOpen] = useState(false);
  const activeFilterCount = countPaperVoucherFilters(filters);

  // Mở lại popup luôn hiển thị đúng bộ lọc đang áp dụng, bỏ phần nhập dở chưa tìm kiếm.
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(filters);
  }, [filters, form, open]);

  const handleClear = () => {
    setOpen(false);
    form.resetFields();
    onChange({});
  };

  return (
    <>
      <Badge
        count={activeFilterCount}
        size="small"
        offset={[-2, 2]}
        title={activeFilterCount > 0 ? `${activeFilterCount} bộ lọc đang áp dụng` : undefined}
      >
        <Button
          variant="outlined"
          icon={<FilterOutlined />}
          aria-label={
            activeFilterCount > 0 ? `Bộ lọc, ${activeFilterCount} bộ lọc đang áp dụng` : "Bộ lọc"
          }
          onClick={() => setOpen(true)}
        >
          Bộ lọc
        </Button>
      </Badge>
      <Modal
        title="Bộ lọc"
        open={open}
        okText="Tìm kiếm"
        cancelText="Hủy"
        okButtonProps={{ htmlType: "submit" }}
        onCancel={() => setOpen(false)}
        width={420}
        modalRender={(dom) => (
          // `name` tạo tiền tố id riêng để field không trùng id với form tạo lô khi cả hai cùng mở.
          <Form
            name="paperVoucherFilter"
            layout="vertical"
            form={form}
            onFinish={(values) => {
              setOpen(false);
              onChange(toFilterValues(values));
            }}
          >
            {dom}
          </Form>
        )}
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            <CancelBtn />
            <Button onClick={handleClear}>Xóa bộ lọc</Button>
            <OkBtn />
          </>
        )}
      >
        <Form.Item name="keyword" label="Mã hoặc tên lô">
          <Input
            allowClear
            autoFocus
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Tìm theo mã hoặc tên lô"
          />
        </Form.Item>
        <Form.Item name="faceValue" label="Mệnh giá">
          <Select
            allowClear
            placeholder="Chọn mệnh giá"
            options={faceValues.map((value) => ({ value, label: formatMoney(value) }))}
          />
        </Form.Item>
        <Form.Item name="status" label="Trạng thái">
          <Select allowClear placeholder="Chọn trạng thái" options={PAPER_VOUCHER_STATUS_OPTIONS} />
        </Form.Item>
        <Form.Item name="expiresAt" label="Hạn sử dụng" className="mb-0">
          <Select
            allowClear
            placeholder="Chọn hạn sử dụng"
            options={[
              ...expiryDates.map((value) => ({ value, label: formatPaperVoucherDate(value) })),
              ...(hasNoExpiryBatch
                ? [{ value: PAPER_VOUCHER_NO_EXPIRY_FILTER, label: PAPER_VOUCHER_NO_EXPIRY_LABEL }]
                : [])
            ]}
          />
        </Form.Item>
      </Modal>
    </>
  );
};

export default PaperVoucherFilter;
