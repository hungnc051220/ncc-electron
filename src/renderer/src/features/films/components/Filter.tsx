import { FilterOutlined } from "@ant-design/icons";
import { manufacturersApi } from "@renderer/api/manufacturers.api";
import { useInfiniteSelectOptions } from "@renderer/hooks/useInfiniteSelectOptions";
import { Button, DatePicker, Form, Input, Modal, Segmented, Select } from "antd";
import { useState } from "react";
import { ValuesProps } from "../FilmsPage";
import { filterEmptyValues } from "@renderer/lib/utils";
import { CountryProps } from "@shared/types";
import type { Dayjs } from "dayjs";

type PremieredPickerType = "day" | "year";

type FilterFormValues = Omit<ValuesProps, "premieredDay" | "premieredYear"> & {
  premieredType?: PremieredPickerType;
  premieredValue?: Dayjs | null;
};

interface FilterProps {
  onSearch: (values: ValuesProps) => void;
  filterValues: ValuesProps;
  setCurrent: (page: number) => void;
  countries: CountryProps[];
}

const Filter = ({ onSearch, filterValues, setCurrent, countries }: FilterProps) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [premieredType, setPremieredType] = useState<PremieredPickerType>("day");

  const manufacturerSelect = useInfiniteSelectOptions({
    queryKey: ["manufacturers"],
    queryFn: ({ pageParam, searchText }) =>
      manufacturersApi.getAll({
        current: pageParam,
        pageSize: 20,
        name: searchText,
        isHidden: false
      }),
    mapOption: (item) => ({
      value: item.id,
      label: item.name
    })
  });

  const onClear = () => {
    setOpen(false);
    setCurrent(1);
    form.resetFields();
    setPremieredType("day");
    manufacturerSelect.onClear();
    onSearch({});
  };

  const handleSearch = (values: FilterFormValues) => {
    const { premieredType = "day", premieredValue, ...restValues } = values;
    const nextValues: ValuesProps = { ...restValues };

    if (premieredValue) {
      if (premieredType === "year") {
        nextValues.premieredYear = premieredValue;
      } else {
        nextValues.premieredDay = premieredValue;
      }
    }

    setOpen(false);
    setCurrent(1);
    onSearch(nextValues);
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
        forceRender
        modalRender={(dom) => (
          <Form
            layout="vertical"
            form={form}
            initialValues={{ premieredType: "day" }}
            onFinish={handleSearch}
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
        <Form.Item name="filmName" label="Tên phim">
          <Input placeholder="Nhập tên phim" />
        </Form.Item>
        <Form.Item name="manufacturerId" label="Hãng phát hành">
          <Select
            placeholder="Chọn hãng phát hành"
            showSearch={{
              filterOption: false,
              onSearch: manufacturerSelect.onSearch
            }}
            loading={manufacturerSelect.loading}
            options={manufacturerSelect.options}
            onPopupScroll={manufacturerSelect.onPopupScroll}
            onClear={manufacturerSelect.onClear}
            allowClear
          />
        </Form.Item>
        <Form.Item name="countryId" label="Nước sản xuất">
          <Select
            placeholder="Chọn nước sản xuất"
            showSearch={{
              optionFilterProp: "label",
              filterSort: (optionA, optionB) =>
                (optionA?.label ?? "")
                  .toLowerCase()
                  .localeCompare((optionB?.label ?? "").toLowerCase())
            }}
            options={countries?.map((item) => ({
              value: item.id,
              label: item.name
            }))}
            allowClear
          />
        </Form.Item>
        <Form.Item label="Khởi chiếu">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Form.Item name="premieredType" noStyle>
              <Segmented
                options={[
                  { label: "Ngày", value: "day" },
                  { label: "Năm", value: "year" }
                ]}
                className="bg-gray-200/80"
                onChange={(value) => {
                  const nextType = value as PremieredPickerType;

                  setPremieredType(nextType);
                  form.setFieldsValue({
                    premieredType: nextType,
                    premieredValue: null
                  });
                }}
              />
            </Form.Item>
            <Form.Item name="premieredValue" noStyle>
              <DatePicker
                className="w-full"
                format={premieredType === "year" ? "YYYY" : "DD/MM/YYYY"}
                picker={premieredType === "year" ? "year" : "date"}
                placeholder={premieredType === "year" ? "Chọn năm" : "Chọn ngày"}
              />
            </Form.Item>
          </div>
        </Form.Item>
      </Modal>
    </>
  );
};

export default Filter;
