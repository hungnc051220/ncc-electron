import { screeningRoomsApi } from "@renderer/api/screeningRooms.api";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { usePlanFilms } from "@renderer/hooks/planFilms/usePlanCinemas";
import { usePlanScreenings } from "@renderer/hooks/planScreenings/usePlanScreenings";
import { useCreatePlanScreening } from "@renderer/hooks/planScreenings/useCreatePlanScreening";
import { useTicketPricesByPlan } from "@renderer/hooks/ticketPrices/useTicketPricesByPlan";
import { useInfiniteSelectOptions } from "@renderer/hooks/useInfiniteSelectOptions";
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
  message,
  Modal,
  Select,
  TimePicker
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const MIN_SCREENING_BREAK_MINUTES = 10;

type FieldType = {
  filmId: number;
  roomId: number;
  projectDate: Dayjs;
  projectTime: Dayjs;
  priceOfPosition1: string;
  priceOfPosition2: string;
  priceOfPosition3: string;
  priceOfPosition4: string;
  isOnlineSelling?: boolean;
  price: number;
};

interface AddSchedulingDialogProps {
  planCinemaId: number;
  selectedRoomId?: number;
  selectedDate: Dayjs | null;
}

const compareNullableText = (left?: string | null, right?: string | null) => {
  return (left ?? "").localeCompare(right ?? "", undefined, {
    numeric: true,
    sensitivity: "base"
  });
};

const AddSchedulingDialog = ({
  planCinemaId,
  selectedRoomId,
  selectedDate
}: AddSchedulingDialogProps) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [isSamePrice, setIsSamePrice] = useState(false);
  const [confirmOfflineOpen, setConfirmOfflineOpen] = useState(false);
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

  const resetForm = () => {
    form.resetFields();
    form.setFieldsValue(defaultFormValues);
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

  const roomSelect = useInfiniteSelectOptions({
    queryKey: ["screening-rooms"],
    queryFn: ({ pageParam }) =>
      screeningRoomsApi.getAll({ current: pageParam, pageSize: 20, hidden: false }),
    mapOption: (item) => ({
      value: item.id,
      label: item.name
    }),
    prefetchAll: true
  });

  const { data: planPricing } = useTicketPricesByPlan({
    roomId,
    versionCode: selectedFilm?.film.versionCode ?? "",
    date: projectDate ? dayjs(projectDate).format() : undefined
  });

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

  const filmOptions = useMemo(() => {
    return (
      films?.data.map((film) => ({
        value: film.filmId,
        label: film.film?.filmName
      })) ?? []
    );
  }, [films]);

  const roomOptions = useMemo(() => {
    return [...roomSelect.options].sort((a, b) => compareNullableText(a.label, b.label));
  }, [roomSelect.options]);

  useEffect(() => {
    if (planPricing && open) {
      form.setFieldValue("priceOfPosition1", planPricing?.[0] || "");
      form.setFieldValue("priceOfPosition2", planPricing?.[1] || "");
      form.setFieldValue("priceOfPosition3", planPricing?.[2] || "");
      form.setFieldValue("priceOfPosition4", planPricing?.[3] || "");
    }
  }, [planPricing, form, open]);

  const buildUniformPriceValue = (source: string | undefined, uniformPrice: number): string => {
    if (!source) return `${uniformPrice}`;
    const sourceValue = `${source}`;
    if (!sourceValue.includes(":")) return `${uniformPrice}`;
    const [seatType] = sourceValue.split(":");
    return `${seatType}:${uniformPrice}`;
  };

  const applyUniformPriceToPositions = (uniformPrice: number) => {
    const positionFields: Array<
      keyof Pick<
        FieldType,
        "priceOfPosition1" | "priceOfPosition2" | "priceOfPosition3" | "priceOfPosition4"
      >
    > = ["priceOfPosition1", "priceOfPosition2", "priceOfPosition3", "priceOfPosition4"];

    const uniformValues = positionFields.reduce(
      (acc, field, index) => {
        const sourceValue = planPricing?.[index];
        acc[field] = sourceValue ? buildUniformPriceValue(sourceValue, uniformPrice) : "";
        return acc;
      },
      {} as Record<(typeof positionFields)[number], string>
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
      ? planPricing?.[0]
        ? buildUniformPriceValue(planPricing[0], uniformPrice)
        : ""
      : values.priceOfPosition1;
    const normalizedPriceOfPosition2 = hasUniformPrice
      ? planPricing?.[1]
        ? buildUniformPriceValue(planPricing[1], uniformPrice)
        : ""
      : values.priceOfPosition2;
    const normalizedPriceOfPosition3 = hasUniformPrice
      ? planPricing?.[2]
        ? buildUniformPriceValue(planPricing[2], uniformPrice)
        : ""
      : values.priceOfPosition3;
    const normalizedPriceOfPosition4 = hasUniformPrice
      ? planPricing?.[3]
        ? buildUniformPriceValue(planPricing[3], uniformPrice)
        : ""
      : values.priceOfPosition4;
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
      priceOfPosition1: normalizedPriceOfPosition1,
      priceOfPosition2: normalizedPriceOfPosition2,
      priceOfPosition3: normalizedPriceOfPosition3,
      priceOfPosition4: normalizedPriceOfPosition4,
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
        okButtonProps={{
          loading: createPlanScreening.isPending
        }}
        cancelButtonProps={{
          disabled: createPlanScreening.isPending
        }}
        width={800}
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
            <Form.Item<FieldType>
              name="roomId"
              label="Phòng chiếu"
              rules={[{ required: true, message: "Chọn phòng chiếu" }]}
            >
              <Select
                options={roomOptions}
                placeholder="Chọn phòng chiếu"
                virtual={false}
                loading={roomSelect.loading}
              />
            </Form.Item>
            <Form.Item<FieldType>
              name="projectDate"
              label="Ngày chiếu"
              rules={[{ required: true, message: "Chọn ngày chiếu" }]}
            >
              <DatePicker format="DD/MM/YYYY" className="w-full" />
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
              onChange={(e) => {
                const checked = e.target.checked;
                setIsSamePrice(checked);
                if (checked) {
                  const currentPrice = Number(form.getFieldValue("price"));
                  if (Number.isFinite(currentPrice)) {
                    applyUniformPriceToPositions(currentPrice);
                  }
                }
              }}
            >
              Đồng giá
            </Checkbox>
            {!isSamePrice ? (
              <div className="bg-primary/10 p-3 rounded-md border border-dashed col-span-2 grid grid-cols-2 gap-3 border-primary">
                <Form.Item<FieldType>
                  name="priceOfPosition1"
                  label="Giá vé 1"
                  rules={[{ required: true, message: "Nhập giá vé 1" }]}
                >
                  <Input placeholder="Nhập giá vé 1" />
                </Form.Item>
                <Form.Item<FieldType> name="priceOfPosition2" label="Giá vé 2">
                  <Input placeholder="Nhập giá vé 2" />
                </Form.Item>
                <Form.Item<FieldType> name="priceOfPosition3" label="Giá vé 3">
                  <Input placeholder="Nhập giá vé 3" />
                </Form.Item>
                <Form.Item<FieldType> name="priceOfPosition4" label="Giá vé 4">
                  <Input placeholder="Nhập giá vé 4" />
                </Form.Item>
              </div>
            ) : (
              <div className="col-span-2">
                <Form.Item<FieldType>
                  name="price"
                  label="Giá vé"
                  rules={[{ required: true, message: "Nhập giá vé" }]}
                >
                  <InputNumber
                    placeholder="Nhập giá vé"
                    className="w-1/2"
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
              <div className="text-base font-semibold text-[var(--ant-color-text)]">
                Không bán online ca chiếu này?
              </div>
              <div className="text-sm font-normal text-[var(--ant-color-text-description)]">
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
        okButtonProps={{
          loading: createPlanScreening.isPending
        }}
        cancelButtonProps={{
          disabled: createPlanScreening.isPending
        }}
      >
        <div className="rounded-2xl my-4 border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-[var(--ant-color-text)] shadow-sm dark:border-amber-400/35 dark:bg-amber-400/10">
          <div className="text-[var(--ant-color-text-secondary)]">
            Bạn có muốn tiếp tục tạo ca chiếu với trạng thái <strong>không bán online</strong>?
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AddSchedulingDialog;
