import { FilterOutlined } from "@ant-design/icons";
import { filmsApi } from "@renderer/api/films.api";
import { manufacturersApi } from "@renderer/api/manufacturers.api";
import { useInfiniteSelectOptions } from "@renderer/hooks/useInfiniteSelectOptions";
import { rangePresets } from "@renderer/lib/dateRangePresets";
import { useQuery } from "@tanstack/react-query";
import { Button, DatePicker, Form, Modal, Select } from "antd";
import dayjs from "dayjs";
import { startTransition, useEffect, useMemo, useState } from "react";
import { ValuesProps } from "../RevenueSharingPage";
import type { Dayjs } from "dayjs";

const { RangePicker } = DatePicker;

interface FilterProps {
  onSearch: (values: ValuesProps) => void;
  filterValues: ValuesProps;
}

type FormValues = Omit<ValuesProps, "dateRange"> & {
  dateRange?: [Dayjs, Dayjs];
};

const mapFilterValuesToFormValues = (values: ValuesProps): FormValues => ({
  ...values,
  dateRange:
    values.dateRange?.length === 2
      ? [dayjs(values.dateRange[0]), dayjs(values.dateRange[1])]
      : undefined
});

const mapFormValuesToFilterValues = (values: FormValues): ValuesProps => ({
  ...values,
  dateRange:
    values.dateRange && values.dateRange.length === 2
      ? [values.dateRange[0].format(), values.dateRange[1].format()]
      : undefined
});

const Filter = ({ onSearch, filterValues }: FilterProps) => {
  const [form] = Form.useForm<FormValues>();
  const [open, setOpen] = useState(false);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<number | undefined>(
    filterValues.manufacturerId
  );
  const [selectedFilmId, setSelectedFilmId] = useState<number | undefined>(filterValues.filmId);

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
    }),
    prefetchAll: true
  });

  const filmSelect = useInfiniteSelectOptions({
    queryKey: ["films", selectedManufacturerId],
    queryFn: ({ pageParam, searchText }) =>
      filmsApi.getAll({
        current: pageParam,
        pageSize: 20,
        filmName: searchText,
        manufacturerId: selectedManufacturerId
      }),
    mapOption: (item) => ({
      value: item.id,
      label: item.filmName
    })
  });

  const { data: selectedFilmDetail } = useQuery({
    queryKey: ["filter-film-detail", selectedFilmId],
    queryFn: () => filmsApi.getDetail(selectedFilmId!),
    enabled: open && !!selectedFilmId
  });

  const manufacturerOptions = useMemo(() => {
    const selectedOption = selectedManufacturerId
      ? ((manufacturerSelect.options.find((item) => item.value === selectedManufacturerId) as
          | { value: number; label: string }
          | undefined) ?? null)
      : null;

    return [selectedOption, ...manufacturerSelect.options].filter(
      (option, index, arr): option is { value: number; label: string } =>
        !!option && arr.findIndex((item) => item?.value === option.value) === index
    );
  }, [manufacturerSelect.options, selectedManufacturerId]);

  const filmOptions = useMemo(() => {
    const selectedOption =
      selectedFilmId && selectedFilmDetail
        ? {
            value: selectedFilmDetail.id,
            label: selectedFilmDetail.filmName
          }
        : null;

    return [selectedOption, ...filmSelect.options].filter(
      (option, index, arr): option is { value: number; label: string } =>
        !!option && arr.findIndex((item) => item?.value === option.value) === index
    );
  }, [filmSelect.options, selectedFilmDetail, selectedFilmId]);

  useEffect(() => {
    form.setFieldsValue(mapFilterValuesToFormValues(filterValues));
    setSelectedManufacturerId(filterValues.manufacturerId);
    setSelectedFilmId(filterValues.filmId);
  }, [filterValues, form]);

  useEffect(() => {
    if (!open || !selectedFilmDetail?.manufacturerId) {
      return;
    }

    if (selectedManufacturerId !== selectedFilmDetail.manufacturerId) {
      setSelectedManufacturerId(selectedFilmDetail.manufacturerId);
      form.setFieldValue("manufacturerId", selectedFilmDetail.manufacturerId);
    }
  }, [open, selectedFilmDetail, selectedManufacturerId, form]);

  const handleManufacturerChange = (value: number | undefined) => {
    setSelectedManufacturerId(value);
    manufacturerSelect.onClear();
    filmSelect.resetSearch();

    if (!value) {
      setSelectedFilmId(undefined);
      form.setFieldsValue({
        manufacturerId: undefined,
        filmId: undefined
      });
      return;
    }

    if (selectedFilmDetail?.manufacturerId && selectedFilmDetail.manufacturerId !== value) {
      setSelectedFilmId(undefined);
      form.setFieldsValue({
        manufacturerId: value,
        filmId: undefined
      });
      return;
    }

    form.setFieldValue("manufacturerId", value);
  };

  const handleFilmChange = (value: number | undefined) => {
    setSelectedFilmId(value);
    filmSelect.onClear();
    form.setFieldValue("filmId", value);
  };

  const onClear = () => {
    setOpen(false);
    startTransition(() => {
      form.resetFields();
      setSelectedManufacturerId(undefined);
      setSelectedFilmId(undefined);
      manufacturerSelect.resetSearch();
      filmSelect.resetSearch();
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
        modalRender={(dom) => (
          <Form
            layout="vertical"
            form={form}
            onFinish={(values) => {
              setOpen(false);
              onSearch(mapFormValuesToFilterValues(values));
            }}
            initialValues={{
              dateRange: [dayjs(), dayjs()]
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
        <Form.Item name="manufacturerId" label="Hãng phim">
          <Select
            showSearch={{
              filterOption: false,
              onSearch: manufacturerSelect.onSearch
            }}
            loading={manufacturerSelect.loading}
            options={manufacturerOptions}
            placeholder="Chọn hãng phim"
            onPopupScroll={manufacturerSelect.onPopupScroll}
            onClear={() => handleManufacturerChange(undefined)}
            onChange={handleManufacturerChange}
            allowClear
          />
        </Form.Item>

        <Form.Item name="filmId" label="Phim">
          <Select
            showSearch={{
              filterOption: false,
              onSearch: filmSelect.onSearch
            }}
            loading={filmSelect.loading}
            options={filmOptions}
            placeholder="Chọn phim"
            onPopupScroll={filmSelect.onPopupScroll}
            onClear={() => handleFilmChange(undefined)}
            onChange={handleFilmChange}
            allowClear
          />
        </Form.Item>

        <Form.Item name="dateRange" label="Khoảng thời gian">
          <RangePicker className="w-full" presets={rangePresets} format="DD/MM/YYYY" />
        </Form.Item>
      </Modal>
    </>
  );
};

export default Filter;
