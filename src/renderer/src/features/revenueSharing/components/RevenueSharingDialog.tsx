import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { filmsApi } from "@renderer/api/films.api";
import { manufacturersApi } from "@renderer/api/manufacturers.api";
import { SharingRateDto } from "@renderer/api/sharingRates.api";
import { useInfiniteSelectOptions } from "@renderer/hooks/useInfiniteSelectOptions";
import { useCreateSharingRate } from "@renderer/hooks/sharingRates/useCreateSharingRate";
import { useDeleteSharingRate } from "@renderer/hooks/sharingRates/useDeleteSharingRate";
import { useSharingRates } from "@renderer/hooks/sharingRates/useSharingRates";
import { useUpdateSharingRate } from "@renderer/hooks/sharingRates/useUpdateSharingRate";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { ReportRevenueSharingProps } from "@shared/types";
import { useQuery } from "@tanstack/react-query";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import type { FormProps, TimeRangePickerProps } from "antd";
import { Button, DatePicker, Form, InputNumber, Modal, Select, Space, message } from "antd";
import { useEffect, useMemo, useState } from "react";

const { RangePicker } = DatePicker;

const rangePresets: TimeRangePickerProps["presets"] = [
  { label: "7 ngày trước", value: [dayjs().add(-7, "d"), dayjs()] },
  { label: "14 ngày trước", value: [dayjs().add(-14, "d"), dayjs()] },
  { label: "30 ngày trước", value: [dayjs().add(-30, "d"), dayjs()] },
  { label: "90 ngày trước", value: [dayjs().add(-90, "d"), dayjs()] }
];

type SharingRateFormItem = {
  id?: number;
  dateRange?: [Dayjs, Dayjs];
  rate?: number;
};

type SelectOption = {
  value: number;
  label: string;
};

type FieldType = {
  manufacturerId?: number;
  filmId?: number;
  sharingRates: SharingRateFormItem[];
};

interface RevenueSharingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRevenueSharing?: ReportRevenueSharingProps | null;
}

const emptyRow: SharingRateFormItem = {
  dateRange: undefined,
  rate: undefined
};

const RevenueSharingDialog = ({
  open,
  onOpenChange,
  editingRevenueSharing
}: RevenueSharingDialogProps) => {
  const [form] = Form.useForm<FieldType>();
  const sharingRates = Form.useWatch("sharingRates", form) ?? [];
  const isEdit = !!editingRevenueSharing;
  const [selectedFilmId, setSelectedFilmId] = useState<number | undefined>(
    editingRevenueSharing?.filmId
  );
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<number | undefined>(
    editingRevenueSharing?.manufacturerId
  );

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
    queryKey: ["film-detail", selectedFilmId],
    queryFn: () => filmsApi.getDetail(selectedFilmId!),
    enabled: open && !!selectedFilmId
  });

  const {
    data: sharingRatesResponse,
    isFetching: isFetchingSharingRates,
    refetch: refetchSharingRates
  } = useSharingRates(
    {
      current: 1,
      pageSize: 100,
      filmId: selectedFilmId
    },
    open && !!selectedFilmId
  );

  const manufacturerOptions = useMemo(() => {
    const editingOption =
      editingRevenueSharing?.manufacturerId && editingRevenueSharing.manufacturerName
        ? {
            value: editingRevenueSharing.manufacturerId,
            label: editingRevenueSharing.manufacturerName
          }
        : null;
    const selectedOption =
      selectedManufacturerId && editingOption?.value !== selectedManufacturerId
        ? ((manufacturerSelect.options.find((item) => item.value === selectedManufacturerId) as
            | SelectOption
            | undefined) ?? null)
        : null;

    return [editingOption, selectedOption, ...manufacturerSelect.options].filter(
      (option, index, arr): option is SelectOption =>
        !!option && arr.findIndex((item) => item?.value === option.value) === index
    );
  }, [editingRevenueSharing, manufacturerSelect.options, selectedManufacturerId]);

  const filmOptions = useMemo(() => {
    const editingOption =
      editingRevenueSharing?.filmId && editingRevenueSharing.filmName
        ? {
            value: editingRevenueSharing.filmId,
            label: editingRevenueSharing.filmName
          }
        : null;
    const selectedOption =
      selectedFilmId && selectedFilmDetail
        ? {
            value: selectedFilmDetail.id,
            label: selectedFilmDetail.filmName
          }
        : null;

    return [editingOption, selectedOption, ...filmSelect.options].filter(
      (option, index, arr): option is SelectOption =>
        !!option && arr.findIndex((item) => item?.value === option.value) === index
    );
  }, [editingRevenueSharing, filmSelect.options, selectedFilmDetail, selectedFilmId]);

  const createSharingRate = useCreateSharingRate();
  const updateSharingRate = useUpdateSharingRate();
  const deleteSharingRate = useDeleteSharingRate();

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    if (!isEdit) {
      setSelectedManufacturerId(undefined);
      setSelectedFilmId(undefined);
      form.setFieldsValue({
        manufacturerId: undefined,
        filmId: undefined,
        sharingRates: [emptyRow]
      });
    }
  }, [open, isEdit, form]);

  useEffect(() => {
    if (!open || !editingRevenueSharing) {
      return;
    }

    form.setFieldsValue({
      manufacturerId: editingRevenueSharing.manufacturerId,
      filmId: editingRevenueSharing.filmId
    });
    setSelectedManufacturerId(editingRevenueSharing.manufacturerId);
    setSelectedFilmId(editingRevenueSharing.filmId);
  }, [open, editingRevenueSharing, form]);

  useEffect(() => {
    if (!open || !selectedFilmDetail?.manufacturerId) {
      return;
    }

    if (selectedManufacturerId !== selectedFilmDetail.manufacturerId) {
      setSelectedManufacturerId(selectedFilmDetail.manufacturerId);
      form.setFieldValue("manufacturerId", selectedFilmDetail.manufacturerId);
    }
  }, [open, selectedFilmDetail, selectedManufacturerId, form]);

  useEffect(() => {
    if (!open || selectedFilmId) {
      return;
    }

    form.setFieldValue("sharingRates", [emptyRow]);
  }, [open, selectedFilmId, form]);

  useEffect(() => {
    if (!open || !selectedFilmId || !sharingRatesResponse) {
      return;
    }

    const sharingRates = [...sharingRatesResponse.data]
      .sort((a, b) => dayjs(a.fromDate).valueOf() - dayjs(b.fromDate).valueOf())
      .map((item) => ({
        id: item.id,
        dateRange: [dayjs(item.fromDate), dayjs(item.toDate)] as [Dayjs, Dayjs],
        rate: item.rate * 100
      }));

    form.setFieldValue("sharingRates", sharingRates.length ? sharingRates : [emptyRow]);
  }, [open, selectedFilmId, sharingRatesResponse, form]);

  const handleManufacturerChange = (value: number | undefined) => {
    setSelectedManufacturerId(value);
    manufacturerSelect.onClear();
    filmSelect.resetSearch();

    if (!value) {
      setSelectedFilmId(undefined);
      form.setFieldsValue({
        manufacturerId: undefined,
        filmId: undefined,
        sharingRates: [emptyRow]
      });
      return;
    }

    if (selectedFilmDetail?.manufacturerId && selectedFilmDetail.manufacturerId !== value) {
      setSelectedFilmId(undefined);
      form.setFieldsValue({
        manufacturerId: value,
        filmId: undefined,
        sharingRates: [emptyRow]
      });
      return;
    }

    form.setFieldValue("manufacturerId", value);
  };

  const handleFilmChange = (value: number | undefined) => {
    setSelectedFilmId(value);
    filmSelect.onClear();
    form.setFieldValue("filmId", value);

    if (!value) {
      form.setFieldValue("sharingRates", [emptyRow]);
    }
  };

  const onCancel = () => {
    form.resetFields();
    setSelectedManufacturerId(undefined);
    setSelectedFilmId(undefined);
    manufacturerSelect.resetSearch();
    filmSelect.resetSearch();
    onOpenChange(false);
  };

  const toDto = (
    manufacturerId: number,
    filmId: number,
    item: SharingRateFormItem
  ): SharingRateDto => {
    const [fromDate, toDate] = item.dateRange ?? [];

    if (!fromDate || !toDate) {
      throw new Error("Thiếu khoảng thời gian chia doanh thu");
    }

    return {
      manufacturerId,
      filmId,
      fromDate: fromDate.startOf("day").toISOString(),
      toDate: toDate.endOf("day").toISOString(),
      rate: Number(item.rate) / 100
    };
  };

  const handleRemove = (index: number, remove: (index: number | number[]) => void) => {
    const item = form.getFieldValue(["sharingRates", index]) as SharingRateFormItem | undefined;

    if (!item?.id) {
      remove(index);
      return;
    }

    deleteSharingRate.mutate(item.id, {
      onSuccess: async () => {
        message.success("Xóa mốc chia doanh thu thành công");
        remove(index);
        await refetchSharingRates();
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Xóa mốc chia doanh thu thất bại"));
      }
    });
  };

  const getDisabledDate = (index: number) => (current: Dayjs) => {
    const normalizedCurrent = current.startOf("day");
    const previousRange = sharingRates[index - 1]?.dateRange;
    const nextRange = sharingRates[index + 1]?.dateRange;

    const previousToDate = previousRange?.[1]?.endOf("day");
    if (previousToDate && normalizedCurrent.valueOf() <= previousToDate.valueOf()) {
      return true;
    }

    const nextFromDate = nextRange?.[0]?.startOf("day");
    if (nextFromDate && normalizedCurrent.valueOf() >= nextFromDate.valueOf()) {
      return true;
    }

    return false;
  };

  const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
    const manufacturerId = values.manufacturerId ?? editingRevenueSharing?.manufacturerId;
    const filmId = values.filmId ?? editingRevenueSharing?.filmId;

    if (!manufacturerId || !filmId) {
      message.error("Vui lòng chọn hãng phim và phim");
      return;
    }

    const sharingRates = values.sharingRates ?? [];
    const existingItems = sharingRates.filter((item) => item.id);
    const newItems = sharingRates.filter((item) => !item.id);

    if (!existingItems.length && !newItems.length) {
      message.error("Vui lòng thêm ít nhất một mốc chia doanh thu");
      return;
    }

    try {
      await Promise.all(
        existingItems.map((item) =>
          updateSharingRate.mutateAsync({
            id: item.id!,
            dto: toDto(manufacturerId, filmId, item)
          })
        )
      );

      if (newItems.length) {
        await createSharingRate.mutateAsync({
          data: newItems.map((item) => toDto(manufacturerId, filmId, item))
        });
      }

      message.success(
        isEdit ? "Cập nhật chia doanh thu thành công" : "Thêm chia doanh thu thành công"
      );
      onCancel();
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          isEdit ? "Cập nhật chia doanh thu thất bại" : "Thêm chia doanh thu thất bại"
        )
      );
    }
  };

  const isSubmitting =
    createSharingRate.isPending || updateSharingRate.isPending || deleteSharingRate.isPending;

  return (
    <Modal
      open={open}
      title={isEdit ? "Cập nhật chia doanh thu" : "Thêm chia doanh thu"}
      onOk={() => form.submit()}
      onCancel={onCancel}
      okButtonProps={{
        loading: isSubmitting || isFetchingSharingRates
      }}
      cancelButtonProps={{
        disabled: isSubmitting
      }}
      width={900}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <div className="grid grid-cols-2 gap-x-3">
          <Form.Item
            name="manufacturerId"
            label="Hãng phim"
            rules={[{ required: true, message: "Vui lòng chọn hãng phim" }]}
          >
            <Select
              showSearch={{
                filterOption: false,
                onSearch: manufacturerSelect.onSearch
              }}
              loading={manufacturerSelect.loading}
              options={manufacturerOptions}
              placeholder="Chọn hãng phim"
              disabled={isEdit}
              onPopupScroll={manufacturerSelect.onPopupScroll}
              onClear={() => handleManufacturerChange(undefined)}
              onChange={handleManufacturerChange}
              allowClear={!isEdit}
            />
          </Form.Item>

          <Form.Item
            name="filmId"
            label="Phim"
            rules={[{ required: true, message: "Vui lòng chọn phim" }]}
          >
            <Select
              showSearch={{
                filterOption: false,
                onSearch: filmSelect.onSearch
              }}
              loading={filmSelect.loading}
              options={filmOptions}
              placeholder="Chọn phim"
              disabled={isEdit}
              onPopupScroll={filmSelect.onPopupScroll}
              onClear={() => handleFilmChange(undefined)}
              onChange={handleFilmChange}
              allowClear={!isEdit}
            />
          </Form.Item>
        </div>

        <div className="rounded-lg border border-dashed border-primary bg-primary/10 p-4">
          <Form.List name="sharingRates">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Space
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      width: "100%",
                      marginBottom: 12
                    }}
                    align="start"
                  >
                    <p className="min-w-12 pt-2 text-sm">Lần {index + 1}</p>

                    <Form.Item {...restField} name={[name, "id"]} hidden>
                      <InputNumber />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      label="Khoảng thời gian"
                      name={[name, "dateRange"]}
                      rules={[{ required: true, message: "Vui lòng chọn khoảng thời gian" }]}
                      className="flex-1"
                    >
                      <RangePicker
                        format="DD/MM/YYYY"
                        presets={rangePresets}
                        className="w-full"
                        disabledDate={getDisabledDate(index)}
                      />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      label="Phần trăm chủ phim"
                      name={[name, "rate"]}
                      rules={[{ required: true, message: "Vui lòng nhập % chủ phim" }]}
                      className="w-48"
                    >
                      <InputNumber
                        placeholder="Nhập % chủ phim"
                        min={0}
                        max={100}
                        className="w-full"
                        addonAfter="%"
                      />
                    </Form.Item>

                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      className="mt-8"
                      onClick={() => handleRemove(name, remove)}
                    />
                  </Space>
                ))}

                <Form.Item noStyle>
                  <Button type="dashed" onClick={() => add(emptyRow)} block icon={<PlusOutlined />}>
                    Thêm mốc chia doanh thu
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </div>
      </Form>
    </Modal>
  );
};

export default RevenueSharingDialog;
