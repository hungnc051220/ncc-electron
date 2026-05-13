import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { SharingRatePaymentHistoryDto } from "@renderer/api/sharingRatePaymentsHistory.api";
import { filmsApi } from "@renderer/api/films.api";
import { manufacturersApi } from "@renderer/api/manufacturers.api";
import { useCreateSharingRatePaymentHistory } from "@renderer/hooks/sharingRatePaymentsHistory/useCreateSharingRatePaymentHistory";
import { useDeleteSharingRatePaymentHistory } from "@renderer/hooks/sharingRatePaymentsHistory/useDeleteSharingRatePaymentHistory";
import { useSharingRatePaymentsHistory } from "@renderer/hooks/sharingRatePaymentsHistory/useSharingRatePaymentsHistory";
import { useUpdateSharingRatePaymentHistory } from "@renderer/hooks/sharingRatePaymentsHistory/useUpdateSharingRatePaymentHistory";
import { useInfiniteSelectOptions } from "@renderer/hooks/useInfiniteSelectOptions";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { useQuery } from "@tanstack/react-query";
import type { FormProps } from "antd";
import { Button, DatePicker, Form, InputNumber, Modal, Select, Spin } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import type { PaymentScheduleSummaryItem } from ".";

type PaymentScheduleFormItem = {
  id?: number;
  paymentDate?: Dayjs;
  amount?: number;
};

type SelectOption = {
  value: number;
  label: string;
};

type FieldType = {
  manufacturerId?: number;
  filmId?: number;
  paymentSchedules: PaymentScheduleFormItem[];
};

interface PaymentScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPaymentSchedule?: PaymentScheduleSummaryItem | null;
}

const emptyRow: PaymentScheduleFormItem = {
  paymentDate: undefined,
  amount: undefined
};

const PaymentScheduleDialog = ({
  open,
  onOpenChange,
  editingPaymentSchedule
}: PaymentScheduleDialogProps) => {
  const { message } = useAntdApp();
  const [form] = Form.useForm<FieldType>();
  const isEdit = !!editingPaymentSchedule;
  const [selectedFilmId, setSelectedFilmId] = useState<number | undefined>(
    editingPaymentSchedule?.filmId
  );
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<number | undefined>(
    editingPaymentSchedule?.manufacturerId
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
    data: paymentHistoryResponse,
    isFetching: isFetchingPaymentHistory,
    refetch: refetchPaymentHistory
  } = useSharingRatePaymentsHistory(
    {
      current: 1,
      pageSize: 100,
      filmId: selectedFilmId
    },
    open && !!selectedFilmId
  );

  const manufacturerOptions = useMemo(() => {
    const editingOption =
      editingPaymentSchedule?.manufacturerId && editingPaymentSchedule.manufacturerName
        ? {
            value: editingPaymentSchedule.manufacturerId,
            label: editingPaymentSchedule.manufacturerName
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
  }, [editingPaymentSchedule, manufacturerSelect.options, selectedManufacturerId]);

  const filmOptions = useMemo(() => {
    const editingOption =
      editingPaymentSchedule?.filmId && editingPaymentSchedule.filmName
        ? {
            value: editingPaymentSchedule.filmId,
            label: editingPaymentSchedule.filmName
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
  }, [editingPaymentSchedule, filmSelect.options, selectedFilmDetail, selectedFilmId]);

  const createPaymentHistory = useCreateSharingRatePaymentHistory();
  const updatePaymentHistory = useUpdateSharingRatePaymentHistory();
  const deletePaymentHistory = useDeleteSharingRatePaymentHistory();

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
        paymentSchedules: [emptyRow]
      });
    }
  }, [open, isEdit, form]);

  useEffect(() => {
    if (!open || !editingPaymentSchedule) {
      return;
    }

    form.setFieldsValue({
      manufacturerId: editingPaymentSchedule.manufacturerId,
      filmId: editingPaymentSchedule.filmId,
      paymentSchedules: [emptyRow]
    });
    setSelectedManufacturerId(editingPaymentSchedule.manufacturerId);
    setSelectedFilmId(editingPaymentSchedule.filmId);
  }, [open, editingPaymentSchedule, form]);

  useEffect(() => {
    if (!open || !selectedFilmId || !paymentHistoryResponse) {
      return;
    }

    const paymentSchedules = [...paymentHistoryResponse.data]
      .sort((a, b) => dayjs(a.paymentDate).valueOf() - dayjs(b.paymentDate).valueOf())
      .map((item) => ({
        id: item.id,
        paymentDate: dayjs(item.paymentDate),
        amount: item.paidAmount
      }));

    form.setFieldValue("paymentSchedules", paymentSchedules.length ? paymentSchedules : [emptyRow]);
  }, [open, selectedFilmId, paymentHistoryResponse, form]);

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
        filmId: undefined,
        paymentSchedules: [emptyRow]
      });
      return;
    }

    if (selectedFilmDetail?.manufacturerId && selectedFilmDetail.manufacturerId !== value) {
      setSelectedFilmId(undefined);
      form.setFieldsValue({
        manufacturerId: value,
        filmId: undefined,
        paymentSchedules: [emptyRow]
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
      form.setFieldValue("paymentSchedules", [emptyRow]);
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
    item: PaymentScheduleFormItem
  ): SharingRatePaymentHistoryDto => {
    if (!item.paymentDate) {
      throw new Error("Thiếu ngày thanh toán");
    }

    return {
      manufacturerId,
      filmId,
      paymentDate: item.paymentDate.format("YYYY-MM-DD"),
      paidAmount: Number(item.amount || 0)
    };
  };

  const handleRemove = (index: number, remove: (index: number | number[]) => void) => {
    const item = form.getFieldValue(["paymentSchedules", index]) as
      | PaymentScheduleFormItem
      | undefined;

    if (!item?.id) {
      remove(index);
      return;
    }

    deletePaymentHistory.mutate(item.id, {
      onSuccess: async () => {
        message.success("Xóa lần thanh toán thành công");
        remove(index);
        await refetchPaymentHistory();
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Xóa lần thanh toán thất bại"));
      }
    });
  };

  const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
    const manufacturerId = values.manufacturerId ?? editingPaymentSchedule?.manufacturerId;
    const filmId = values.filmId ?? editingPaymentSchedule?.filmId;

    if (!manufacturerId || !filmId) {
      message.error("Vui lòng chọn hãng phim và phim");
      return;
    }

    const paymentSchedules = values.paymentSchedules ?? [];
    const existingItems = paymentSchedules.filter((item) => item.id);
    const newItems = paymentSchedules.filter((item) => !item.id);

    if (!existingItems.length && !newItems.length) {
      message.error("Vui lòng thêm ít nhất một lần thanh toán");
      return;
    }

    try {
      await Promise.all(
        existingItems.map((item) =>
          updatePaymentHistory.mutateAsync({
            id: item.id!,
            dto: toDto(manufacturerId, filmId, item)
          })
        )
      );

      if (newItems.length) {
        await createPaymentHistory.mutateAsync(
          newItems.map((item) => toDto(manufacturerId, filmId, item))
        );
      }

      message.success(
        isEdit ? "Cập nhật tiến độ thanh toán thành công" : "Thêm tiến độ thanh toán thành công"
      );
      onCancel();
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          isEdit ? "Cập nhật tiến độ thanh toán thất bại" : "Thêm tiến độ thanh toán thất bại"
        )
      );
    }
  };

  const isSubmitting =
    createPaymentHistory.isPending ||
    updatePaymentHistory.isPending ||
    deletePaymentHistory.isPending;

  return (
    <Modal
      open={open}
      title={isEdit ? "Cập nhật tiến độ thanh toán" : "Thêm tiến độ thanh toán"}
      onOk={() => form.submit()}
      onCancel={onCancel}
      okButtonProps={{
        loading: isSubmitting || isFetchingPaymentHistory
      }}
      cancelButtonProps={{
        disabled: isSubmitting
      }}
      width={760}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0">
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

        <div className="rounded-md border border-dashed border-primary bg-primary/10 p-3">
          <Form.List name="paymentSchedules">
            {(fields, { add, remove }) => (
              <Spin spinning={isFetchingPaymentHistory}>
                {fields.map(({ key, name, ...restField }, index) => (
                  <div
                    key={key}
                    className="grid grid-cols-[64px_minmax(180px,1fr)_minmax(220px,1fr)_32px] items-start gap-x-2"
                  >
                    <p className="min-w-12 pt-2 text-sm">Lần {index + 1}</p>

                    <Form.Item {...restField} name={[name, "id"]} hidden>
                      <InputNumber />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      label="Ngày thanh toán"
                      name={[name, "paymentDate"]}
                      rules={[{ required: true, message: "Vui lòng chọn ngày thanh toán" }]}
                      className="mb-2"
                    >
                      <DatePicker format="DD/MM/YYYY" className="w-full" />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      label="Số tiền thanh toán"
                      name={[name, "amount"]}
                      rules={[{ required: true, message: "Vui lòng nhập số tiền thanh toán" }]}
                      className="mb-2"
                    >
                      <InputNumber<number>
                        min={0}
                        placeholder="Nhập số tiền thanh toán"
                        className="w-full"
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                        parser={(value) => value?.replace(/\$\s?|(,*)/g, "") as unknown as number}
                        suffix="đ"
                      />
                    </Form.Item>

                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      className="mt-8"
                      onClick={() => handleRemove(name, remove)}
                    />
                  </div>
                ))}

                <Form.Item noStyle>
                  <Button type="dashed" onClick={() => add(emptyRow)} block icon={<PlusOutlined />}>
                    Thêm lần thanh toán
                  </Button>
                </Form.Item>
              </Spin>
            )}
          </Form.List>
        </div>
      </Form>
    </Modal>
  );
};

export default PaymentScheduleDialog;
