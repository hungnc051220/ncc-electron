"use client";

import {
  getPlanFilms,
  getPlanPricing,
  getScreeningRooms,
} from "@/data/loaders";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { FormProps } from "antd";
import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  TimePicker,
} from "antd";
import axios from "axios";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import queryString from "query-string";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type FieldType = {
  filmId: number;
  roomId: number;
  projectDate: Dayjs;
  projectTime: Dayjs;
  priceOfPosition1: string;
  priceOfPosition2: string;
  priceOfPosition3: string;
  priceOfPosition4: string;
};

interface AddSchedulingDialogProps {
  planCinemaId: number;
}

const AddSchedulingDialog = ({ planCinemaId }: AddSchedulingDialogProps) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);

  const filmId = Form.useWatch("filmId", form);
  const roomId = Form.useWatch("roomId", form);
  const versionCode = Form.useWatch("versionCode", form);
  const projectDate = Form.useWatch("projectDate", form);
  const projectTime = Form.useWatch("projectTime", form);

  const { data: films, isFetching: isFetchingFilms } = useQuery({
    queryKey: ["plan-film", planCinemaId],
    queryFn: () => {
      const query = queryString.stringify(
        {
          filter: JSON.stringify({ planCinemaId }),
          current: 1,
          pageSize: 100,
          sort: "order",
        },
        { skipEmptyString: true, skipNull: true },
      );
      return getPlanFilms(query);
    },
    enabled: !!planCinemaId,
  });

  useEffect(() => {
    if (filmId) {
      form.setFieldValue(
        "versionCode",
        films?.data?.find((film) => film.filmId === filmId)?.film.versionCode,
      );
      form.setFieldValue(
        "duration",
        films?.data?.find((film) => film.filmId === filmId)?.film.duration,
      );
    }
  }, [filmId, form, films]);

  const {
    data: rooms,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["screening-rooms"],
    queryFn: ({ pageParam = 1 }) =>
      getScreeningRooms({ page: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    },
  });

  const { data: planPricing } = useQuery({
    queryKey: ["plan-pricing", roomId, versionCode, projectDate, projectTime],
    queryFn: () => {
      if (!roomId || !versionCode || !projectDate || !projectTime) return;
      return getPlanPricing({
        roomId,
        versionCode,
        date: dayjs(projectDate).format(),
      });
    },
    enabled:
      !!filmId && !!roomId && !!versionCode && !!projectDate && !!projectTime,
    retry: false,
  });

  const filmOptions = useMemo(() => {
    return (
      films?.data.map((film) => ({
        value: film.filmId,
        label: film.film.filmName,
      })) ?? []
    );
  }, [films]);

  const roomOptions = useMemo(() => {
    return (
      rooms?.pages.flatMap((page) =>
        page.data.map((item) => ({
          value: item.id,
          label: item.name,
        })),
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

  useEffect(() => {
    if (projectTime && filmId) {
      form.setFieldValue(
        "endTime",
        dayjs(projectTime).add(
          films?.data.find((film) => film.filmId === filmId)?.film.duration ??
            0,
          "minute",
        ),
      );
    }
  }, [projectTime, form, filmId, films]);

  const addPlanScreeningMutation = useMutation({
    mutationFn: (data: FieldType) => {
      const body = {
        planCinemaId,
        projectDate: dayjs(data.projectDate).format("YYYY-MM-DD"),
        projectTime: dayjs(data.projectTime).format(),
        filmId: data.filmId,
        roomId: data.roomId,
        priceOfPosition1: data.priceOfPosition1,
        priceOfPosition2: data.priceOfPosition2,
        priceOfPosition3: data.priceOfPosition3,
        priceOfPosition4: data.priceOfPosition4,
      };
      return axios.post("/api/plan-screenings/create", {
        ...body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-screenings"] });
      toast.success("Thêm ca chiếu vào kế hoạch thành công");
      form.resetFields();
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    addPlanScreeningMutation.mutate(values);
  };

  const onCancel = () => {
    setOpen(false);
    form.resetFields();
  };

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
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
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
                onPopupScroll={(e) => {
                  const target = e.target as HTMLElement;
                  if (
                    target.scrollTop + target.offsetHeight ===
                      target.scrollHeight &&
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
            <Form.Item name="duration" label="Thời lượng (phút)">
              <Input readOnly placeholder="Thời lượng (phút)" />
            </Form.Item>
            <Form.Item name="versionCode" label="Phiên bản">
              <Input readOnly placeholder="Phiên bản" />
            </Form.Item>
            <Form.Item<FieldType>
              name="priceOfPosition1"
              label="Giá vé 1"
              rules={[{ required: true, message: "Nhập giá vé 1" }]}
            >
              <Input placeholder="Nhập giá vé 1" />
            </Form.Item>
            <Form.Item<FieldType>
              name="priceOfPosition2"
              label="Giá vé 2"
              rules={[{ required: true, message: "Nhập giá vé 2" }]}
            >
              <Input placeholder="Nhập giá vé 2" />
            </Form.Item>
            <Form.Item<FieldType> name="priceOfPosition3" label="Giá vé 3">
              <Input placeholder="Nhập giá vé 3" />
            </Form.Item>
            <Form.Item<FieldType> name="priceOfPosition4" label="Giá vé 4">
              <Input placeholder="Nhập giá vé 4" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default AddSchedulingDialog;
