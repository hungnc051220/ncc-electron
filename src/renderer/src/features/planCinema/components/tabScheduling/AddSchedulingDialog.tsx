import { usePlanFilms } from "@renderer/hooks/planFilms/usePlanCinemas";
import { useCreatePlanScreening } from "@renderer/hooks/planScreenings/useCreatePlanScreening";
import { usePlanScreenings } from "@renderer/hooks/planScreenings/usePlanScreenings";
import { useTicketPricesByPlan } from "@renderer/hooks/ticketPrices/useTicketPricesByPlan";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { getPlanScreeningDateTime } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import type { FormProps } from "antd";
import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  TimePicker
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

const MIN_SCREENING_BREAK_MINUTES = 5;

type FieldType = {
  filmId: number;
  roomId: number;
  projectDate: Dayjs;
  projectTime: Dayjs;
  priceOfPosition1?: number;
  priceOfPosition2?: number;
  priceOfPosition3?: number;
  isOnlineSelling?: boolean;
  price?: number;
};

type PositionField = "priceOfPosition1" | "priceOfPosition2" | "priceOfPosition3";

type PositionPricingValue = {
  seatType: string;
  price: number;
};

type PositionPricingMap = Record<PositionField, PositionPricingValue | undefined>;
type PositionPriceFormValues = Record<PositionField, number | undefined>;
const positionFields: PositionField[] = [
  "priceOfPosition1",
  "priceOfPosition2",
  "priceOfPosition3"
];

interface AddSchedulingDialogProps {
  planCinemaId: number;
  selectedRoomId?: number;
  selectedDate: Dayjs | null;
  roomOptions: Array<{ value: number | string; label: string }>;
  roomOptionsLoading?: boolean;
}

const getDynamicPricingKey = (
  pricings?: Record<string, number>,
  matcher?: (key: string) => boolean
) => {
  if (!pricings || !matcher) return undefined;
  return Object.keys(pricings).find(matcher);
};

const getPlanPricingValues = (pricings?: Record<string, number>): PositionPricingMap => {
  const position1Key = getDynamicPricingKey(pricings, (key) => key.startsWith("D"));
  const position2Key = getDynamicPricingKey(pricings, (key) => key === "T");
  const position3Key = getDynamicPricingKey(pricings, (key) => key === "V");

  return {
    priceOfPosition1:
      position1Key && pricings?.[position1Key] !== undefined
        ? { seatType: position1Key, price: pricings[position1Key] }
        : undefined,
    priceOfPosition2:
      position2Key && pricings?.[position2Key] !== undefined
        ? { seatType: position2Key, price: pricings[position2Key] }
        : undefined,
    priceOfPosition3:
      position3Key && pricings?.[position3Key] !== undefined
        ? { seatType: position3Key, price: pricings[position3Key] }
        : undefined
  };
};

const getPositionPriceFormValues = (pricingMap: PositionPricingMap): PositionPriceFormValues => ({
  priceOfPosition1: pricingMap.priceOfPosition1?.price,
  priceOfPosition2: pricingMap.priceOfPosition2?.price,
  priceOfPosition3: pricingMap.priceOfPosition3?.price
});

const buildPricingPayloadValue = (seatType?: string, price?: number) => {
  if (!seatType || !Number.isFinite(price)) {
    return "";
  }

  return `${seatType}:${price}`;
};

const formatTicketPrice = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numericValue = typeof value === "number" ? value : Number(`${value}`.replace(/,/g, ""));
  if (!Number.isFinite(numericValue)) {
    return "";
  }

  return numericValue.toLocaleString("en-US");
};

const parseTicketPrice = (value?: string): number => {
  if (!value) {
    return 0;
  }

  const parsedValue = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const AddSchedulingDialog = ({
  planCinemaId,
  selectedRoomId,
  selectedDate,
  roomOptions,
  roomOptionsLoading
}: AddSchedulingDialogProps) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [isSamePrice, setIsSamePrice] = useState(false);
  const [confirmOfflineOpen, setConfirmOfflineOpen] = useState(false);
  const [savedIndividualPrices, setSavedIndividualPrices] = useState<PositionPriceFormValues>({
    priceOfPosition1: undefined,
    priceOfPosition2: undefined,
    priceOfPosition3: undefined
  });
  const [pendingSubmitBody, setPendingSubmitBody] = useState<{
    planCinemaId: number;
    projectDate: string;
    projectTime: string;
    filmId: number;
    roomId: number;
    priceOfPosition1: string;
    priceOfPosition2: string;
    priceOfPosition3: string;
    priceOfPosition4: string;
    isOnlineSelling?: boolean;
  } | null>(null);
  const { message } = useAntdApp();
  const { can } = usePermission();
  const canUpdate = can("plan_cinema", "update");
  const defaultFormValues = useMemo(
    () => ({
      roomId: selectedRoomId,
      projectDate: selectedDate,
      isOnlineSelling: true
    }),
    [selectedRoomId, selectedDate]
  );

  const filmId = Form.useWatch("filmId", form);
  const roomId = Form.useWatch("roomId", form);
  const projectDate = Form.useWatch("projectDate", form);
  const projectTime = Form.useWatch("projectTime", form);

  const createPlanScreening = useCreatePlanScreening();

  const { data: films, isFetching: isFetchingFilms } = usePlanFilms({
    current: 1,
    pageSize: 100,
    planCinemaId
  });

  const selectedFilm = useMemo(
    () => films?.data?.find((film) => film.filmId === filmId),
    [filmId, films]
  );

  const planPricingDateTime = useMemo(() => {
    if (!projectDate || !projectTime) {
      return undefined;
    }

    return getPlanScreeningDateTime(
      dayjs(projectDate).format("YYYY-MM-DD"),
      dayjs(projectTime).format()
    );
  }, [projectDate, projectTime]);

  const { data: planPricing } = useTicketPricesByPlan({
    roomId,
    versionCode: selectedFilm?.film.versionCode ?? "",
    date: planPricingDateTime?.format(),
    filmId: selectedFilm?.filmId
  });

  const mappedPlanPricing = useMemo(
    () => getPlanPricingValues(planPricing?.pricings),
    [planPricing?.pricings]
  );

  const activePositionFields = useMemo(
    () => positionFields.filter((field) => !!mappedPlanPricing[field]?.seatType),
    [mappedPlanPricing]
  );

  const resetForm = () => {
    form.resetFields();
    form.setFieldsValue(defaultFormValues);
    setSavedIndividualPrices(getPositionPriceFormValues(mappedPlanPricing));
    setIsSamePrice(false);
    setConfirmOfflineOpen(false);
    setPendingSubmitBody(null);
  };

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      roomId: selectedRoomId,
      projectDate: selectedDate
    });
  }, [selectedRoomId, selectedDate, form, open]);

  const planScreeningParams = useMemo(
    () => ({
      current: 1,
      pageSize: 500,
      planCinemaId,
      roomId,
      fromDate: projectDate ? dayjs(projectDate).format("YYYY-MM-DD") : undefined,
      toDate: projectDate ? dayjs(projectDate).format("YYYY-MM-DD") : undefined
    }),
    [planCinemaId, projectDate, roomId]
  );

  const { data: existingScreenings } = usePlanScreenings(planScreeningParams);

  useEffect(() => {
    if (selectedFilm) {
      form.setFieldValue("versionCode", selectedFilm.film?.versionCode);
      form.setFieldValue("duration", selectedFilm.film?.duration);
      return;
    }

    form.setFieldValue("versionCode", undefined);
    form.setFieldValue("duration", undefined);
  }, [form, selectedFilm]);

  const filmOptions = useMemo(
    () =>
      films?.data.map((film) => ({
        value: film.filmId,
        label: film.film?.filmName
      })) ?? [],
    [films]
  );

  useEffect(() => {
    const pricingFormValues = getPositionPriceFormValues(mappedPlanPricing);
    if (open) {
      form.setFieldsValue(pricingFormValues);
    }
    setSavedIndividualPrices(pricingFormValues);
  }, [mappedPlanPricing, form, open]);

  const applyUniformPriceToPositions = (uniformPrice: number) => {
    const uniformValues = positionFields.reduce(
      (acc, field) => {
        acc[field] = mappedPlanPricing[field]?.seatType ? uniformPrice : undefined;
        return acc;
      },
      {} as Record<PositionField, number | undefined>
    );

    form.setFieldsValue(uniformValues);
  };

  useEffect(() => {
    if (projectTime && filmId) {
      form.setFieldValue(
        "endTime",
        dayjs(projectTime).add(selectedFilm?.film?.duration ?? 0, "minute")
      );
    }
  }, [projectTime, form, filmId, selectedFilm]);

  const getScreeningBreakError = (values: FieldType) => {
    const screeningStart = getPlanScreeningDateTime(
      dayjs(values.projectDate).format("YYYY-MM-DD"),
      dayjs(values.projectTime).format()
    );
    const filmDuration = selectedFilm?.film?.duration ?? 0;

    if (!screeningStart?.isValid() || !filmDuration) {
      return null;
    }

    const screeningEnd = screeningStart.add(filmDuration, "minute");

    const hasConflict = (existingScreenings?.data ?? []).some((screening) => {
      if (screening.roomId !== values.roomId) {
        return false;
      }

      const existingStart = getPlanScreeningDateTime(screening.projectDate, screening.projectTime);
      if (!existingStart?.isValid()) {
        return false;
      }

      const existingEnd = existingStart.add(screening.filmInfo?.duration ?? 0, "minute");

      return (
        screeningStart.isBefore(existingEnd.add(MIN_SCREENING_BREAK_MINUTES, "minute")) &&
        existingStart.isBefore(screeningEnd.add(MIN_SCREENING_BREAK_MINUTES, "minute"))
      );
    });

    if (!hasConflict) {
      return null;
    }

    return `Các ca chiếu trong cùng một phòng phải cách nhau ít nhất ${MIN_SCREENING_BREAK_MINUTES} phút.`;
  };

  const submitCreatePlanScreening = (body: {
    planCinemaId: number;
    projectDate: string;
    projectTime: string;
    filmId: number;
    roomId: number;
    daypartId?: number;
    priceOfPosition1: string;
    priceOfPosition2: string;
    priceOfPosition3: string;
    priceOfPosition4: string;
    isOnlineSelling?: boolean;
  }) => {
    createPlanScreening.mutate(
      { ...body, isOnlineSelling: body.isOnlineSelling ? 1 : 0 },
      {
        onSuccess: () => {
          message.success("Thêm ca chiếu vào kế hoạch thành công");
          resetForm();
          setOpen(false);
        },
        onError: (error: unknown) => {
          message.error(getApiErrorMessage(error, "Thêm ca chiếu vào kế hoạch thất bại"));
        }
      }
    );
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    const uniformPrice = Number(values.price);
    const hasUniformPrice = isSamePrice && Number.isFinite(uniformPrice);
    const screeningDateTime = getPlanScreeningDateTime(
      dayjs(values.projectDate).format("YYYY-MM-DD"),
      dayjs(values.projectTime).format()
    );

    const normalizedPriceOfPosition1 = hasUniformPrice
      ? buildPricingPayloadValue(mappedPlanPricing.priceOfPosition1?.seatType, uniformPrice)
      : buildPricingPayloadValue(
          mappedPlanPricing.priceOfPosition1?.seatType,
          values.priceOfPosition1
        );
    const normalizedPriceOfPosition2 = hasUniformPrice
      ? buildPricingPayloadValue(mappedPlanPricing.priceOfPosition2?.seatType, uniformPrice)
      : buildPricingPayloadValue(
          mappedPlanPricing.priceOfPosition2?.seatType,
          values.priceOfPosition2
        );
    const normalizedPriceOfPosition3 = hasUniformPrice
      ? buildPricingPayloadValue(mappedPlanPricing.priceOfPosition3?.seatType, uniformPrice)
      : buildPricingPayloadValue(
          mappedPlanPricing.priceOfPosition3?.seatType,
          values.priceOfPosition3
        );

    const sameFilmBreakError = getScreeningBreakError(values);
    if (sameFilmBreakError) {
      message.error(sameFilmBreakError);
      return;
    }

    const body = {
      planCinemaId,
      projectDate: dayjs(values.projectDate).format("YYYY-MM-DD"),
      projectTime: screeningDateTime?.format() ?? dayjs(values.projectTime).format(),
      filmId: values.filmId,
      roomId: values.roomId,
      daypartId: planPricing?.dayPartId,
      priceOfPosition1: normalizedPriceOfPosition1,
      priceOfPosition2: normalizedPriceOfPosition2,
      priceOfPosition3: normalizedPriceOfPosition3,
      priceOfPosition4: "",
      isOnlineSelling: values.isOnlineSelling
    };

    if (values.isOnlineSelling === false) {
      setPendingSubmitBody(body);
      setConfirmOfflineOpen(true);
      return;
    }

    submitCreatePlanScreening(body);
  };

  const onCancel = () => {
    setOpen(false);
    resetForm();
  };

  const handleConfirmOfflineSubmit = () => {
    if (!pendingSubmitBody) {
      return;
    }

    submitCreatePlanScreening(pendingSubmitBody);
  };

  if (!canUpdate) {
    return null;
  }

  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
      >
        Thêm ca chiếu mới
      </Button>

      <Modal
        title="Thêm ca chiếu mới"
        open={open}
        onCancel={onCancel}
        onOk={() => form.submit()}
        okButtonProps={{ loading: createPlanScreening.isPending }}
        cancelButtonProps={{ disabled: createPlanScreening.isPending }}
        width={900}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={defaultFormValues}>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item<FieldType>
              name="filmId"
              label="Phim"
              rules={[{ required: true, message: "Chọn phim" }]}
            >
              <Select
                options={filmOptions}
                placeholder="Chọn phim"
                loading={isFetchingFilms}
                showSearch={{
                  optionFilterProp: "label",
                  filterOption: (input, option) =>
                    `${option?.label ?? ""}`.toLowerCase().includes(input.toLowerCase())
                }}
              />
            </Form.Item>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item<FieldType>
                name="projectTime"
                label="Giờ chiếu"
                rules={[{ required: true, message: "Chọn giờ chiếu" }]}
              >
                <TimePicker format="HH:mm" className="w-full" />
              </Form.Item>
              <Form.Item name="endTime" label="Giờ kết thúc">
                <TimePicker format="HH:mm" className="w-full" disabled />
              </Form.Item>
            </div>

            <Form.Item<FieldType>
              name="projectDate"
              label="Ngày chiếu"
              rules={[{ required: true, message: "Chọn ngày chiếu" }]}
            >
              <DatePicker format="DD/MM/YYYY" className="w-full" />
            </Form.Item>

            <Form.Item<FieldType>
              name="roomId"
              label="Phòng chiếu"
              rules={[{ required: true, message: "Chọn phòng chiếu" }]}
            >
              <Select
                options={roomOptions}
                placeholder="Chọn phòng chiếu"
                loading={roomOptionsLoading}
              />
            </Form.Item>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="duration" label="Thời lượng (phút)">
                <Input readOnly placeholder="Thời lượng (phút)" />
              </Form.Item>
              <Form.Item name="versionCode" label="Phiên bản">
                <Input readOnly placeholder="Phiên bản" />
              </Form.Item>
            </div>

            <Form.Item name="isOnlineSelling" valuePropName="checked">
              <Checkbox className="mt-10.5">Bán online</Checkbox>
            </Form.Item>

            <Checkbox
              checked={isSamePrice}
              disabled={activePositionFields.length === 0}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsSamePrice(checked);

                if (checked) {
                  setSavedIndividualPrices({
                    priceOfPosition1: form.getFieldValue("priceOfPosition1"),
                    priceOfPosition2: form.getFieldValue("priceOfPosition2"),
                    priceOfPosition3: form.getFieldValue("priceOfPosition3")
                  });

                  const currentPrice = Number(form.getFieldValue("price"));
                  if (Number.isFinite(currentPrice)) {
                    applyUniformPriceToPositions(currentPrice);
                  }
                } else {
                  form.setFieldsValue(savedIndividualPrices);
                }
              }}
            >
              Đồng giá
            </Checkbox>

            {!isSamePrice ? (
              <div className="bg-primary/10 col-span-2 grid grid-cols-3 gap-3 rounded-md border border-dashed border-primary p-3">
                <Form.Item<FieldType>
                  name="priceOfPosition1"
                  label="Giá vé 1"
                  rules={
                    mappedPlanPricing.priceOfPosition1?.seatType
                      ? [{ required: true, message: "Nhập giá vé 1" }]
                      : []
                  }
                >
                  <InputNumber<number>
                    className="w-full"
                    placeholder="Nhập giá vé 1"
                    min={0}
                    precision={0}
                    disabled={!mappedPlanPricing.priceOfPosition1?.seatType}
                    prefix={
                      mappedPlanPricing.priceOfPosition1?.seatType
                        ? `${mappedPlanPricing.priceOfPosition1.seatType}:`
                        : undefined
                    }
                    formatter={formatTicketPrice}
                    parser={parseTicketPrice}
                  />
                </Form.Item>

                <Form.Item<FieldType>
                  name="priceOfPosition2"
                  label="Giá vé 2"
                  rules={
                    mappedPlanPricing.priceOfPosition2?.seatType
                      ? [{ required: true, message: "Nhập giá vé 2" }]
                      : []
                  }
                >
                  <InputNumber<number>
                    className="w-full"
                    placeholder="Nhập giá vé 2"
                    min={0}
                    precision={0}
                    disabled={!mappedPlanPricing.priceOfPosition2?.seatType}
                    prefix={
                      mappedPlanPricing.priceOfPosition2?.seatType
                        ? `${mappedPlanPricing.priceOfPosition2.seatType}:`
                        : undefined
                    }
                    formatter={formatTicketPrice}
                    parser={parseTicketPrice}
                  />
                </Form.Item>

                <Form.Item<FieldType>
                  name="priceOfPosition3"
                  label="Giá vé 3"
                  rules={
                    mappedPlanPricing.priceOfPosition3?.seatType
                      ? [{ required: true, message: "Nhập giá vé 3" }]
                      : []
                  }
                >
                  <InputNumber<number>
                    className="w-full"
                    placeholder="Nhập giá vé 3"
                    min={0}
                    precision={0}
                    disabled={!mappedPlanPricing.priceOfPosition3?.seatType}
                    prefix={
                      mappedPlanPricing.priceOfPosition3?.seatType
                        ? `${mappedPlanPricing.priceOfPosition3.seatType}:`
                        : undefined
                    }
                    formatter={formatTicketPrice}
                    parser={parseTicketPrice}
                  />
                </Form.Item>
              </div>
            ) : (
              <div className="col-span-2">
                <Form.Item<FieldType>
                  name="price"
                  label="Giá vé"
                  rules={
                    activePositionFields.length > 0
                      ? [{ required: true, message: "Nhập giá vé" }]
                      : []
                  }
                >
                  <InputNumber<number>
                    placeholder="Nhập giá vé"
                    className="w-1/2"
                    min={0}
                    precision={0}
                    disabled={activePositionFields.length === 0}
                    formatter={formatTicketPrice}
                    parser={parseTicketPrice}
                    onChange={(value) => {
                      if (typeof value === "number") {
                        applyUniformPriceToPositions(value);
                      }
                    }}
                  />
                </Form.Item>
              </div>
            )}
          </div>
        </Form>
      </Modal>

      <Modal
        open={confirmOfflineOpen}
        centered
        width={480}
        title={
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/15 text-amber-600 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-300">
              <AlertTriangle className="size-5" />
            </div>
            <div className="space-y-1">
              <div className="text-base font-semibold text-(--ant-color-text)">
                Không bán online ca chiếu này?
              </div>
              <div className="text-sm font-normal text-(--ant-color-text-description)">
                Ca chiếu sẽ chỉ được bán tại quầy.
              </div>
            </div>
          </div>
        }
        okText="Xác nhận lưu"
        cancelText="Quay lại"
        onOk={handleConfirmOfflineSubmit}
        onCancel={() => {
          setConfirmOfflineOpen(false);
          setPendingSubmitBody(null);
        }}
        okButtonProps={{ loading: createPlanScreening.isPending }}
        cancelButtonProps={{ disabled: createPlanScreening.isPending }}
      >
        <div className="my-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-(--ant-color-text) shadow-sm dark:border-amber-400/35 dark:bg-amber-400/10">
          <div className="text-(--ant-color-text-secondary)">
            Bạn có muốn tiếp tục tạo ca chiếu với trạng thái <strong>không bán online</strong>?
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AddSchedulingDialog;
