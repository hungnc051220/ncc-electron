import { FilterOutlined } from "@ant-design/icons";
import { filmsApi } from "@renderer/api/films.api";
import { manufacturersApi } from "@renderer/api/manufacturers.api";
import { usersApi } from "@renderer/api/users.api";
import { useInfiniteSelectOptions } from "@renderer/hooks/useInfiniteSelectOptions";
import { useQuery } from "@tanstack/react-query";
import type { TimeRangePickerProps } from "antd";
import { Button, DatePicker, Form, Modal, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { startTransition, useEffect, useMemo, useState } from "react";
import { ValuesProps } from ".";

const { RangePicker } = DatePicker;

const rangePresets: TimeRangePickerProps["presets"] = [
  { label: "7 ngày trước", value: [dayjs().add(-7, "d"), dayjs()] },
  { label: "14 ngày trước", value: [dayjs().add(-14, "d"), dayjs()] },
  { label: "30 ngày trước", value: [dayjs().add(-30, "d"), dayjs()] },
  { label: "90 ngày trước", value: [dayjs().add(-90, "d"), dayjs()] }
];

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
  const selectedUserId = Form.useWatch("userId", form);
  const watchedManufacturerId = Form.useWatch("manufacturerId", form);
  const watchedFilmId = Form.useWatch("filmId", form);

  const userSelect = useInfiniteSelectOptions({
    queryKey: ["users"],
    queryFn: ({ pageParam, searchText }) =>
      usersApi.getAll({ current: pageParam, pageSize: 20, keyword: searchText }),
    mapOption: (user) => {
      const fullName = [user.customerFirstName, user.customerLastName]
        .filter((value): value is string => !!value?.trim())
        .join(" ");

      return {
        value: user.id,
        label: fullName || user.username
      };
    }
  });

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
    queryKey: ["staff-revenue-by-film-film-detail", selectedFilmId],
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

  const handleUserChange = (value: number | undefined) => {
    userSelect.onClear();

    if (!value) {
      form.setFieldValue("userId", undefined);
      return;
    }

    setSelectedManufacturerId(undefined);
    setSelectedFilmId(undefined);
    manufacturerSelect.resetSearch();
    filmSelect.resetSearch();
    form.setFieldsValue({
      userId: value,
      manufacturerId: undefined,
      filmId: undefined
    });
  };

  const handleFilmChange = (value: number | undefined) => {
    filmSelect.onClear();

    if (!value) {
      setSelectedFilmId(undefined);
      form.setFieldValue("filmId", undefined);
      return;
    }

    setSelectedFilmId(value);
    userSelect.resetSearch();
    form.setFieldsValue({
      userId: undefined,
      filmId: value
    });
  };

  const onClear = () => {
    setOpen(false);
    startTransition(() => {
      form.resetFields();
      setSelectedManufacturerId(undefined);
      setSelectedFilmId(undefined);
      userSelect.resetSearch();
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
          <div className="absolute right-0 top-0 z-10 size-3 translate-x-1/3 -translate-y-1/3">
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
              const selectedUserOption = userSelect.options.find((option) => option.value === values.userId);
              const selectedManufacturerOption = manufacturerOptions.find(
                (option) => option.value === values.manufacturerId
              );

              onSearch({
                ...mapFormValuesToFilterValues(values),
                userName:
                  typeof selectedUserOption?.label === "string"
                    ? selectedUserOption.label
                    : undefined,
                manufacturerName:
                  typeof selectedManufacturerOption?.label === "string"
                    ? selectedManufacturerOption.label
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
        <Form.Item name="userId" label="Nhân viên">
          <Select
            showSearch={{
              filterOption: false,
              onSearch: userSelect.onSearch
            }}
            loading={userSelect.loading}
            options={userSelect.options}
            placeholder="Chọn nhân viên"
            onPopupScroll={userSelect.onPopupScroll}
            onClear={userSelect.onClear}
            onChange={handleUserChange}
            disabled={!!watchedManufacturerId || !!watchedFilmId}
            allowClear
          />
        </Form.Item>

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
            disabled={!!selectedUserId}
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
            disabled={!!selectedUserId}
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
