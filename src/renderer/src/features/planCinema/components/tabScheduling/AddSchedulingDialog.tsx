import { screeningRoomsApi } from "@renderer/api/screeningRooms.api";
import { usePlanFilms } from "@renderer/hooks/planFilms/usePlanCinemas";
import { useCreatePlanScreening } from "@renderer/hooks/planScreenings/useCreatePlanScreening";
import { useTicketPricesByPlan } from "@renderer/hooks/ticketPrices/useTicketPricesByPlan";
import { usePermission } from "@renderer/permissions/usePermission";
import { ApiError } from "@shared/types";
import { useInfiniteQuery } from "@tanstack/react-query";
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
import axios from "axios";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

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
}

const AddSchedulingDialog = ({ planCinemaId }: AddSchedulingDialogProps) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [isSamePrice, setIsSamePrice] = useState(false);
  const { can } = usePermission();
  const canUpdate = can("plan_cinema", "update");

  const filmId = Form.useWatch("filmId", form);
  const roomId = Form.useWatch("roomId", form);
  const versionCode = Form.useWatch("versionCode", form);
  const projectDate = Form.useWatch("projectDate", form);
  const projectTime = Form.useWatch("projectTime", form);

  const createPlanScreening = useCreatePlanScreening();

  const { data: films, isFetching: isFetchingFilms } = usePlanFilms({
    current: 1,
    pageSize: 100,
    planCinemaId
  });

  const {
    data: rooms,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["screening-rooms"],
    queryFn: ({ pageParam = 1 }) =>
      screeningRoomsApi.getAll({ current: pageParam, pageSize: 20, hidden: false }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  const { data: planPricing } = useTicketPricesByPlan({
    roomId,
    versionCode,
    date: projectDate ? dayjs(projectDate).format() : undefined
  });

  useEffect(() => {
    if (filmId) {
      form.setFieldValue(
        "versionCode",
        films?.data?.find((film) => film.filmId === filmId)?.film.versionCode
      );
      form.setFieldValue(
        "duration",
        films?.data?.find((film) => film.filmId === filmId)?.film.duration
      );
    }
  }, [filmId, form, films]);

  const filmOptions = useMemo(() => {
    return (
      films?.data.map((film) => ({
        value: film.filmId,
        label: film.film.filmName
      })) ?? []
    );
  }, [films]);

  const roomOptions = useMemo(() => {
    return (
      rooms?.pages.flatMap((page) =>
        page.data.map((item) => ({
          value: item.id,
          label: item.name
        }))
      ) ?? []
    );
  }, [rooms]);

  useEffect(() => {
    if (planPricing) {
      form.setFieldValue("priceOfPosition1", planPricing?.[0] || "");
      form.setFieldValue("priceOfPosition2", planPricing?.[1] || "");
      form.setFieldValue("priceOfPosition3", planPricing?.[2] || "");
      form.setFieldValue("priceOfPosition4", planPricing?.[3] || "");
    }
  }, [planPricing, form]);

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
        dayjs(projectTime).add(
          films?.data.find((film) => film.filmId === filmId)?.film.duration ?? 0,
          "minute"
        )
      );
    }
  }, [projectTime, form, filmId, films]);

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    const uniformPrice = Number(values.price);
    const hasUniformPrice = isSamePrice && Number.isFinite(uniformPrice);
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

    const body = {
      planCinemaId,
      projectDate: dayjs(values.projectDate).format("YYYY-MM-DD"),
      projectTime: dayjs(values.projectTime).format(),
      filmId: values.filmId,
      roomId: values.roomId,
      priceOfPosition1: normalizedPriceOfPosition1,
      priceOfPosition2: normalizedPriceOfPosition2,
      priceOfPosition3: normalizedPriceOfPosition3,
      priceOfPosition4: normalizedPriceOfPosition4,
      isOnlineSelling: values.isOnlineSelling
    };

    createPlanScreening.mutate(
      { ...body, isOnlineSelling: values.isOnlineSelling ? 1 : 0 },
      {
        onSuccess: () => {
          message.success("Thêm ca chiếu vào kế hoạch thành công");
          form.resetFields();
          setOpen(false);
        },
        onError: (error: unknown) => {
          let msg = "Thêm ca chiếu vào kế hoạch thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
        }
      }
    );
  };

  const onCancel = () => {
    setOpen(false);
    form.resetFields();
    setIsSamePrice(false);
  };

  if (!canUpdate) {
    return null;
  }

  return (
    <>
      <Button variant="outlined" color="primary" onClick={() => setOpen(true)}>
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
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            projectDate: dayjs(),
            projectTime: dayjs(),
            isOnlineSelling: true
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Form.Item<FieldType>
              name="filmId"
              label="Phim"
              rules={[{ required: true, message: "Chọn phim" }]}
            >
              <Select options={filmOptions} placeholder="Chọn phim" loading={isFetchingFilms} />
            </Form.Item>
            <Form.Item<FieldType>
              name="roomId"
              label="Phòng chiếu"
              rules={[{ required: true, message: "Chọn phòng chiếu" }]}
            >
              <Select
                options={roomOptions}
                placeholder="Chọn phòng chiếu"
                onPopupScroll={(e) => {
                  const target = e.target as HTMLElement;
                  if (
                    target.scrollTop + target.offsetHeight === target.scrollHeight &&
                    hasNextPage &&
                    !isFetchingNextPage
                  ) {
                    fetchNextPage();
                  }
                }}
                loading={isFetchingNextPage || isFetching}
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
    </>
  );
};

export default AddSchedulingDialog;
