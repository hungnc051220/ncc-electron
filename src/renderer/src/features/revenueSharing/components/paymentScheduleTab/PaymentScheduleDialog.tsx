import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import {
  SharingRatePaymentHistoryDto,
  sharingRatePaymentsHistoryApi
} from "@renderer/api/sharingRatePaymentsHistory.api";
import { filmsApi } from "@renderer/api/films.api";
import { manufacturersApi } from "@renderer/api/manufacturers.api";
import { sharingRatePaymentsHistoryKeys } from "@renderer/hooks/sharingRatePaymentsHistory/keys";
import { useSharingRatePaymentsHistory } from "@renderer/hooks/sharingRatePaymentsHistory/useSharingRatePaymentsHistory";
import { useInfiniteSelectOptions } from "@renderer/hooks/useInfiniteSelectOptions";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormProps } from "antd";
import { Button, DatePicker, Form, InputNumber, Modal, Select, Spin } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PaymentScheduleSummaryItem } from ".";

type PaymentScheduleFormItem = {
  id?: number;
  paymentDate?: Dayjs;
  amount?: number;
};

type PaymentScheduleRowMeta = {
  id?: number;
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
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FieldType>();
  const isEdit = !!editingPaymentSchedule;
  const [selectedFilmId, setSelectedFilmId] = useState<number | undefined>(
    editingPaymentSchedule?.filmId
  );
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<number | undefined>(
    editingPaymentSchedule?.manufacturerId
  );
  const [originalPaymentSchedules, setOriginalPaymentSchedules] = useState<
    PaymentScheduleFormItem[]
  >([]);
  const [paymentScheduleRowMeta, setPaymentScheduleRowMeta] = useState<PaymentScheduleRowMeta[]>([
    {}
  ]);
  const [deletedPaymentScheduleIds, setDeletedPaymentScheduleIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const deletedPaymentScheduleIdsRef = useRef<number[]>([]);

  const resetDeletedPaymentScheduleIds = useCallback(() => {
    deletedPaymentScheduleIdsRef.current = [];
    setDeletedPaymentScheduleIds([]);
  }, []);

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

  const { data: paymentHistoryResponse, isFetching: isFetchingPaymentHistory } =
    useSharingRatePaymentsHistory(
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

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setOriginalPaymentSchedules([]);
      setPaymentScheduleRowMeta([{}]);
      resetDeletedPaymentScheduleIds();
      return;
    }

    if (!isEdit) {
      setSelectedManufacturerId(undefined);
      setSelectedFilmId(undefined);
      setOriginalPaymentSchedules([]);
      setPaymentScheduleRowMeta([{}]);
      resetDeletedPaymentScheduleIds();
      form.setFieldsValue({
        manufacturerId: undefined,
        filmId: undefined,
        paymentSchedules: [emptyRow]
      });
    }
  }, [open, isEdit, form, resetDeletedPaymentScheduleIds]);

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
        id: item.itemId,
        paymentDate: dayjs(item.paymentDate),
        amount: item.paidAmount
      }));

    setOriginalPaymentSchedules(paymentSchedules);
    setPaymentScheduleRowMeta(
      paymentSchedules.length ? paymentSchedules.map((item) => ({ id: item.id })) : [{}]
    );
    resetDeletedPaymentScheduleIds();
    form.setFieldValue("paymentSchedules", paymentSchedules.length ? paymentSchedules : [emptyRow]);
  }, [open, selectedFilmId, paymentHistoryResponse, form, resetDeletedPaymentScheduleIds]);

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
      setOriginalPaymentSchedules([]);
      setPaymentScheduleRowMeta([{}]);
      resetDeletedPaymentScheduleIds();
      return;
    }

    if (selectedFilmDetail?.manufacturerId && selectedFilmDetail.manufacturerId !== value) {
      setSelectedFilmId(undefined);
      form.setFieldsValue({
        manufacturerId: value,
        filmId: undefined,
        paymentSchedules: [emptyRow]
      });
      setOriginalPaymentSchedules([]);
      setPaymentScheduleRowMeta([{}]);
      resetDeletedPaymentScheduleIds();
      return;
    }

    form.setFieldValue("manufacturerId", value);
  };

  const handleFilmChange = (value: number | undefined) => {
    setSelectedFilmId(value);
    filmSelect.onClear();
    form.setFieldValue("filmId", value);
    setOriginalPaymentSchedules([]);
    setPaymentScheduleRowMeta([{}]);
    resetDeletedPaymentScheduleIds();

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
    setOriginalPaymentSchedules([]);
    setPaymentScheduleRowMeta([{}]);
    resetDeletedPaymentScheduleIds();
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

  const handleRemove = (
    fieldName: number,
    rowIndex: number,
    remove: (index: number | number[]) => void
  ) => {
    const item = form.getFieldValue(["paymentSchedules", fieldName]) as
      | PaymentScheduleFormItem
      | undefined;
    const deletedId =
      item?.id ?? paymentScheduleRowMeta[rowIndex]?.id ?? originalPaymentSchedules[rowIndex]?.id;

    if (deletedId) {
      deletedPaymentScheduleIdsRef.current = Array.from(
        new Set([...deletedPaymentScheduleIdsRef.current, deletedId])
      );
      setDeletedPaymentScheduleIds(deletedPaymentScheduleIdsRef.current);
    }

    remove(fieldName);
    setPaymentScheduleRowMeta((prev) => prev.filter((_, itemIndex) => itemIndex !== rowIndex));
  };

  const handleAdd = (add: (defaultValue?: PaymentScheduleFormItem) => void) => {
    add(emptyRow);
    setPaymentScheduleRowMeta((prev) => [...prev, {}]);
  };

  const isSamePaymentSchedule = (
    currentItem: PaymentScheduleFormItem,
    originalItem?: PaymentScheduleFormItem
  ) => {
    if (!originalItem) {
      return false;
    }

    const currentPaymentDate = currentItem.paymentDate?.format("YYYY-MM-DD");
    const originalPaymentDate = originalItem.paymentDate?.format("YYYY-MM-DD");

    return (
      currentPaymentDate === originalPaymentDate &&
      Number(currentItem.amount || 0) === Number(originalItem.amount || 0)
    );
  };

  const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
    const manufacturerId = values.manufacturerId ?? editingPaymentSchedule?.manufacturerId;
    const filmId = values.filmId ?? editingPaymentSchedule?.filmId;

    if (!manufacturerId || !filmId) {
      message.error("Vui lòng chọn hãng phim và phim");
      return;
    }

    const paymentSchedules = (values.paymentSchedules ?? []).map((item, index) => ({
      ...item,
      id: item.id ?? paymentScheduleRowMeta[index]?.id
    }));
    const originalItemsById = new Map(
      originalPaymentSchedules
        .filter((item): item is PaymentScheduleFormItem & { id: number } => !!item.id)
        .map((item) => [item.id, item])
    );
    const currentIds = new Set(
      paymentSchedules.map((item) => item.id).filter((id): id is number => !!id)
    );
    const existingItems = paymentSchedules
      .filter((item) => item.id)
      .filter((item) => !isSamePaymentSchedule(item, originalItemsById.get(item.id!)));
    const newItems = paymentSchedules.filter((item) => !item.id);
    const deletedIds = Array.from(
      new Set([
        ...deletedPaymentScheduleIdsRef.current,
        ...deletedPaymentScheduleIds,
        ...originalPaymentSchedules
          .map((item) => item.id)
          .filter((id): id is number => !!id && !currentIds.has(id))
      ])
    );

    if (!paymentSchedules.length && !originalPaymentSchedules.length) {
      message.error("Vui lòng thêm ít nhất một lần thanh toán");
      return;
    }

    try {
      setIsSubmitting(true);
      await Promise.all(
        existingItems.map((item) =>
          sharingRatePaymentsHistoryApi.update(item.id!, toDto(manufacturerId, filmId, item))
        )
      );

      if (newItems.length) {
        await sharingRatePaymentsHistoryApi.create(
          newItems.map((item) => toDto(manufacturerId, filmId, item))
        );
      }

      await Promise.all(deletedIds.map((id) => sharingRatePaymentsHistoryApi.delete(id)));

      await queryClient.invalidateQueries({
        queryKey: sharingRatePaymentsHistoryKeys.all
      });

      message.success(
        isEdit ? "Cập nhật tiến độ thanh toán thành công" : "Thêm tiến độ thanh toán thành công"
      );
      setIsSubmitting(false);
      onCancel();
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          isEdit ? "Cập nhật tiến độ thanh toán thất bại" : "Thêm tiến độ thanh toán thất bại"
        )
      );
      setIsSubmitting(false);
    }
  };

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
                      onClick={() => handleRemove(name, index, remove)}
                    />
                  </div>
                ))}

                <Form.Item noStyle>
                  <Button
                    type="dashed"
                    onClick={() => handleAdd(add)}
                    block
                    icon={<PlusOutlined />}
                  >
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
