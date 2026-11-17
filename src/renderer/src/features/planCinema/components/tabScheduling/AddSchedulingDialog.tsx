import { usePlanFilms } from "@renderer/hooks/planFilms/usePlanCinemas";
import { useCreatePlanScreening } from "@renderer/hooks/planScreenings/useCreatePlanScreening";
import { usePlanScreenings } from "@renderer/hooks/planScreenings/usePlanScreenings";
import { useTicketPricesByPlan } from "@renderer/hooks/ticketPrices/useTicketPricesByPlan";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { getPlanScreeningDateTime } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import type { PlanScreeningPriceMode, PricingStaleDetails } from "@shared/types";
import type { FormProps } from "antd";
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  TimePicker,
  Typography
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { usePricingRules } from "@renderer/hooks/ticketPrices/usePricingRules";
import {
  buildStaleComparisonRows,
  getPlanPricingErrorMessage,
  getPlanPricingReason,
  getPricingBlockReason,
  getPricingStaleDetails,
  resolvePriceMode
} from "./planPricing";
import { getU22CheckboxState, getU22PolicyInvalidMessage } from "./u22Screening";

const MIN_SCREENING_BREAK_MINUTES = 5;

/** Body tạo ca chiếu (kèm nguồn giá và phiên bản giá để backend phát hiện giá cũ). */
type CreateScreeningBody = {
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
  priceMode: PlanScreeningPriceMode;
  pricingVersion?: string;
  /** Chỉ gửi khi DB có bảng chính sách U22 theo suất. */
  u22Enabled?: boolean;
};

/**
 * Field giá vị trí: người dùng sửa một trong các field này → giá nhập tay (`MANUAL`). Ô giá Đồng giá (`price`)
 * không tính, vì Đồng giá đã là chế độ `UNIFORM` riêng.
 */
const PRICE_FORM_FIELDS = ["priceOfPosition1", "priceOfPosition2", "priceOfPosition3"];

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
const emptyPositionPriceFormValues: PositionPriceFormValues = {
  priceOfPosition1: undefined,
  priceOfPosition2: undefined,
  priceOfPosition3: undefined
};

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
  const [savedIndividualPrices, setSavedIndividualPrices] = useState<PositionPriceFormValues>(
    emptyPositionPriceFormValues
  );
  const [pendingSubmitBody, setPendingSubmitBody] = useState<CreateScreeningBody | null>(null);
  /**
   * `LIST` = dùng giá bảng; `MANUAL` = người dùng đã sửa ô giá (không tự ghi đè). Đồng giá là `UNIFORM`, tính từ
   * checkbox Đồng giá khi lưu.
   */
  const [priceMode, setPriceMode] = useState<PlanScreeningPriceMode>("LIST");
  /** Lựa chọn tường minh của người dùng cho "Áp dụng ưu đãi U22"; `null` = chưa chạm (mặc định BẬT). */
  const [u22UserChoice, setU22UserChoice] = useState<boolean | null>(null);
  /** 409 `PRICING_STALE`: giá đã gửi và giá hiện tại để người dùng so sánh trước khi lưu lại. */
  const [stalePricing, setStalePricing] = useState<{
    body: CreateScreeningBody;
    details: PricingStaleDetails;
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

  const planPricingDto = {
    roomId,
    versionCode: selectedFilm?.film.versionCode ?? "",
    date: planPricingDateTime?.format(),
    filmId: selectedFilm?.filmId
  };
  const isPlanPricingEnabled = Boolean(
    planPricingDto.date &&
    planPricingDto.roomId &&
    planPricingDto.versionCode &&
    planPricingDto.filmId
  );
  const {
    data: planPricing,
    error: planPricingError,
    isError: isPlanPricingError,
    isFetching: isPlanPricingFetching,
    isPlaceholderData: isPlanPricingPlaceholder,
    refetch: refetchPlanPricing
  } = useTicketPricesByPlan(planPricingDto);

  const mappedPlanPricing = useMemo(
    () => getPlanPricingValues(isPlanPricingPlaceholder ? undefined : planPricing?.pricings),
    [isPlanPricingPlaceholder, planPricing?.pricings]
  );

  const activePositionFields = useMemo(
    () => positionFields.filter((field) => !!mappedPlanPricing[field]?.seatType),
    [mappedPlanPricing]
  );

  // Không lưu khi giá đang tải, đang là giá cũ giữ chỗ, lỗi, hoặc phòng/phiên bản chưa có giá.
  const pricingBlockReason = getPricingBlockReason({
    isQueryEnabled: isPlanPricingEnabled,
    isFetching: isPlanPricingFetching,
    isPlaceholderData: isPlanPricingPlaceholder,
    isError: isPlanPricingError,
    hasPricing: activePositionFields.length > 0,
    errorMessage: isPlanPricingError ? getPlanPricingErrorMessage(planPricingError) : null
  });
  const isPricingSettled = isPlanPricingEnabled && pricingBlockReason === null;
  const pricingReason = isPlanPricingPlaceholder ? null : getPlanPricingReason(planPricing);

  // Chính sách U22 theo suất: khóa TẮT ở Đồng giá / ngày lễ / ngày không áp ưu đãi / phiên bản không phải 2D; DB
  // chưa có bảng chính sách thì khóa và không gửi; chưa đủ thông tin thì chặn lưu.
  const {
    data: pricingRules,
    isLoading: isPricingRulesLoading,
    refetch: refetchPricingRules
  } = usePricingRules();
  const u22State = getU22CheckboxState({
    rules: pricingRules,
    isRulesLoading: isPricingRulesLoading,
    isPricingReady: isPricingSettled,
    pricing: isPlanPricingPlaceholder ? null : planPricing,
    versionCode: selectedFilm?.film.versionCode,
    isUniform: isSamePrice,
    userChoice: u22UserChoice
  });
  const isSaveBlockedByU22 = isPlanPricingEnabled && u22State.undetermined;
  const isSaveBlockedByPricing =
    (isPlanPricingEnabled && pricingBlockReason !== null) || isSaveBlockedByU22;

  const resetForm = () => {
    form.resetFields();
    form.setFieldsValue(defaultFormValues);
    setSavedIndividualPrices(emptyPositionPriceFormValues);
    setIsSamePrice(false);
    setConfirmOfflineOpen(false);
    setPendingSubmitBody(null);
    setPriceMode("LIST");
    setU22UserChoice(null);
    setStalePricing(null);
  };

  /** "Dùng lại giá bảng": bỏ giá nhập tay, tải lại giá bảng mới nhất và điền vào form. */
  const restoreListPrices = () => {
    setPriceMode("LIST");
    setIsSamePrice(false);
    form.setFieldValue("price", undefined);
    form.setFieldsValue(getPositionPriceFormValues(mappedPlanPricing));
    void refetchPlanPricing();
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
    // Giá nhập tay không bị giá bảng tự ghi đè; người dùng chọn "Dùng lại giá bảng" nếu muốn.
    if (priceMode === "MANUAL") return;
    const pricingFormValues = getPositionPriceFormValues(mappedPlanPricing);
    if (open) {
      form.setFieldsValue(pricingFormValues);
    }
    setSavedIndividualPrices(pricingFormValues);
  }, [mappedPlanPricing, form, open, priceMode]);

  useEffect(() => {
    if (!open || !isPlanPricingError) {
      return;
    }

    // Lỗi tra giá nghiệp vụ (khung giờ trùng, chưa đọc được giá vé ngày lễ…): báo rõ, không dùng giá 0đ.
    message.error(getPlanPricingErrorMessage(planPricingError));
  }, [isPlanPricingError, message, open, planPricingError]);

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

  const submitCreatePlanScreening = (body: CreateScreeningBody) => {
    createPlanScreening.mutate(
      { ...body, isOnlineSelling: body.isOnlineSelling ? 1 : 0 },
      {
        onSuccess: (result) => {
          message.success("Thêm ca chiếu vào kế hoạch thành công");
          // Chỉ báo đã lưu thiết lập U22 khi backend xác nhận có dòng chính sách của suất.
          if (body.u22Enabled !== undefined) {
            if (result?.u22Policy?.source === "SCREENING_POLICY") {
              message.info(
                result.u22Policy.u22Enabled
                  ? "Đã lưu thiết lập U22 của suất: Áp dụng ưu đãi U22."
                  : "Đã lưu thiết lập U22 của suất: Không áp dụng ưu đãi U22."
              );
            } else {
              message.warning(
                "Ca chiếu đã được thêm nhưng máy chủ chưa xác nhận thiết lập U22 của suất. Kiểm tra cột U22 trong danh sách giờ chiếu."
              );
            }
          }
          resetForm();
          setOpen(false);
        },
        onError: (error: unknown) => {
          const staleDetails = getPricingStaleDetails(error);
          if (staleDetails) {
            // Giá đã đổi (ngày lễ / khung giờ / bảng giá): không tự lưu lại, cho người dùng so sánh và xác nhận.
            setConfirmOfflineOpen(false);
            setPendingSubmitBody(null);
            setStalePricing({ body, details: staleDetails });
            void refetchPlanPricing();
            return;
          }
          const u22InvalidMessage = getU22PolicyInvalidMessage(error);
          if (u22InvalidMessage) {
            // Ngày/suất vừa đổi điều kiện (vd. vừa thành ngày lễ): tải lại để checkbox U22 phản ánh đúng.
            setConfirmOfflineOpen(false);
            setPendingSubmitBody(null);
            message.error(u22InvalidMessage);
            void refetchPlanPricing();
            void refetchPricingRules();
            return;
          }
          message.error(getApiErrorMessage(error, "Thêm ca chiếu vào kế hoạch thất bại"));
        }
      }
    );
  };

  /** Người dùng đã xem so sánh giá: tải giá mới vào form, phải bấm lưu lại để xác nhận. */
  const acceptStalePricing = () => {
    const wasManual =
      stalePricing?.body.priceMode === "MANUAL" || stalePricing?.body.priceMode === "UNIFORM";
    setStalePricing(null);
    if (wasManual) {
      // Giữ giá nhập tay; chỉ cập nhật phiên bản giá mới nhất để lưu lại.
      void refetchPlanPricing();
      message.info("Đã tải lại giá bảng. Giá nhập tay được giữ nguyên, kiểm tra rồi bấm Lưu.");
      return;
    }
    setPriceMode("LIST");
    setIsSamePrice(false);
    void refetchPlanPricing();
    message.info("Đã tải giá mới vào form. Kiểm tra lại giá rồi bấm Lưu để xác nhận.");
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    if (isSaveBlockedByPricing) {
      message.warning(pricingBlockReason ?? u22State.reason ?? "Giá vé chưa sẵn sàng");
      return;
    }
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

    const submittedPrices = hasUniformPrice
      ? {
          priceOfPosition1: uniformPrice,
          priceOfPosition2: uniformPrice,
          priceOfPosition3: uniformPrice
        }
      : values;
    const body: CreateScreeningBody = {
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
      isOnlineSelling: values.isOnlineSelling,
      priceMode: resolvePriceMode(priceMode, submittedPrices, mappedPlanPricing, isSamePrice),
      ...(planPricing?.pricingVersion ? { pricingVersion: planPricing.pricingVersion } : {}),
      // Backend cũ / DB chưa có bảng chính sách: không gửi `u22Enabled`.
      ...(u22State.submit ? { u22Enabled: u22State.checked } : {})
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
        okButtonProps={{
          loading: createPlanScreening.isPending,
          disabled: isSaveBlockedByPricing || Boolean(stalePricing)
        }}
        cancelButtonProps={{ disabled: createPlanScreening.isPending }}
        width={900}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={defaultFormValues}
          onValuesChange={(changedValues: Record<string, unknown>) => {
            // Người dùng tự sửa ô giá → giá nhập tay (setFieldsValue của giá bảng không kích hoạt sự kiện này).
            if (Object.keys(changedValues).some((key) => PRICE_FORM_FIELDS.includes(key))) {
              setPriceMode("MANUAL");
            }
          }}
        >
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

            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                <Checkbox
                  checked={isSamePrice}
                  disabled={activePositionFields.length === 0}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    // Đồng giá là chế độ giá `UNIFORM` (tính khi lưu); bỏ Đồng giá trả về chế độ trước đó.
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
                {u22State.visible && (
                  <Checkbox
                    checked={u22State.checked}
                    disabled={u22State.disabled}
                    onChange={(e) => setU22UserChoice(e.target.checked)}
                  >
                    Áp dụng ưu đãi U22
                  </Checkbox>
                )}
              </div>
              {u22State.visible && u22State.reason && (
                <Typography.Text
                  type="secondary"
                  className="text-xs"
                  data-testid="u22-screening-reason"
                >
                  {u22State.reason}
                </Typography.Text>
              )}
            </div>

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

            <div className="col-span-2 flex flex-col gap-2" data-testid="plan-pricing-status">
              {pricingReason && (
                <Alert
                  type={planPricing?.pricingReason === "HOLIDAY" ? "warning" : "info"}
                  showIcon
                  title={pricingReason}
                />
              )}
              {(priceMode === "MANUAL" || isSamePrice) && (
                <div className="flex flex-wrap items-center gap-2">
                  <Typography.Text type="secondary">
                    {isSamePrice
                      ? "Đang dùng Đồng giá."
                      : "Đang dùng giá nhập tay: giá bảng không tự ghi đè giá đã nhập."}
                  </Typography.Text>
                  <Button size="small" onClick={restoreListPrices}>
                    Dùng lại giá bảng
                  </Button>
                </div>
              )}
              {isSaveBlockedByPricing && (pricingBlockReason || u22State.reason) && (
                <Typography.Text type="secondary" data-testid="save-block-reason">
                  {pricingBlockReason ?? u22State.reason}
                </Typography.Text>
              )}
            </div>
          </div>
        </Form>
      </Modal>

      <Modal
        open={Boolean(stalePricing)}
        centered
        width={560}
        title="Giá vé của ca chiếu đã thay đổi"
        okText="Tải giá mới vào form"
        cancelText="Đóng"
        onOk={acceptStalePricing}
        onCancel={() => setStalePricing(null)}
        mask={{ closable: false }}
      >
        {stalePricing && (
          <div className="flex flex-col gap-3">
            <Alert
              type="warning"
              showIcon
              title="Ca chiếu chưa được lưu."
              description="Giá bạn đã dùng không còn khớp với giá bảng hiện hành (ngày lễ, khung giờ hoặc bảng giá vừa thay đổi). Hãy kiểm tra giá mới rồi bấm Lưu để xác nhận; hệ thống không tự lưu lại bằng giá cũ."
            />
            {stalePricing.details.current && getPlanPricingReason(stalePricing.details.current) && (
              <Typography.Text>
                {getPlanPricingReason(stalePricing.details.current)}
              </Typography.Text>
            )}
            <table className="w-full border-collapse text-sm" aria-label="So sánh giá vé">
              <thead>
                <tr className="text-left">
                  <th className="border-b border-(--ant-color-border) py-1">Loại ghế</th>
                  <th className="border-b border-(--ant-color-border) py-1">Giá đã dùng</th>
                  <th className="border-b border-(--ant-color-border) py-1">Giá hiện hành</th>
                </tr>
              </thead>
              <tbody>
                {buildStaleComparisonRows(
                  stalePricing.details.requested ?? stalePricing.body,
                  stalePricing.details.current
                ).map((row) => (
                  <tr key={row.seatType}>
                    <td className="py-1">{row.seatType}</td>
                    <td className="py-1">{row.requested}</td>
                    <td
                      className={
                        row.changed ? "py-1 font-semibold text-(--ant-color-warning)" : "py-1"
                      }
                    >
                      {row.current}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stalePricing.body.priceMode !== "LIST" && (
              <Typography.Text type="secondary">
                Bạn đang dùng giá nhập tay: giá nhập tay được giữ nguyên, chỉ tải lại thông tin giá
                bảng mới nhất.
              </Typography.Text>
            )}
          </div>
        )}
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
