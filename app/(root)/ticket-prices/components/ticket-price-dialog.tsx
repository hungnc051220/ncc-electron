"use client";

import { getDayParts, getSeatTypes } from "@/data/loaders";
import { formatter } from "@/lib/utils";
import { TicketPriceProps } from "@/types";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { FormProps } from "antd";
import { Form, Input, InputNumber, Modal, Select } from "antd";
import axios from "axios";
import { useMemo } from "react";
import { toast } from "sonner";

type FieldType = {
  versionCode: string;
  daypartId: number;
  positionId: number;
  price: number;
};

interface TicketPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTicketPrice?: TicketPriceProps | null;
}

const TicketPriceDialog = ({
  open,
  onOpenChange,
  editingTicketPrice,
}: TicketPriceDialogProps) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = !!editingTicketPrice;

  const {
    data: dayparts,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["dayparts"],
    queryFn: ({ pageParam = 1 }) =>
      getDayParts({ page: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    },
  });

  const {
    data: seatTypes,
    fetchNextPage: fetchNextPageSeatTypes,
    hasNextPage: hasNextPageSeatTypes,
    isFetching: isFetchingSeatTypes,
    isFetchingNextPage: isFetchingNextPageSeatTypes,
  } = useInfiniteQuery({
    queryKey: ["seat-types"],
    queryFn: ({ pageParam = 1 }) =>
      getSeatTypes({ page: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    },
  });

  const daypartOptions = useMemo(() => {
    return (
      dayparts?.pages.flatMap((page) =>
        page.data.map((item) => ({
          value: item.id,
          label: item.name,
        })),
      ) ?? []
    );
  }, [dayparts]);

  const seatTypesOptions = useMemo(() => {
    return (
      seatTypes?.pages.flatMap((page) =>
        page.data.map((item) => ({
          value: item.id,
          label: item.name,
        })),
      ) ?? []
    );
  }, [seatTypes]);

  const ticketPriceMutation = useMutation({
    mutationFn: (data: FieldType) => {
      if (!isEdit) {
        return axios.post("/api/ticket-prices/create", {
          ...data,
        });
      } else {
        return axios.post("/api/ticket-prices/update", {
          ...data,
          id: editingTicketPrice.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-prices"] });
      toast.success(`${isEdit ? "Cập nhật" : "Thêm"} giá vé thành công`);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  const onOk = () => form.submit();

  const getInitialValues = (): FieldType | undefined => {
    if (!editingTicketPrice) return undefined;
    return {
      versionCode: editingTicketPrice.versionCode,
      daypartId: editingTicketPrice.daypartId,
      positionId: editingTicketPrice.positionId,
      price: editingTicketPrice.price,
    };
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    ticketPriceMutation.mutate(values);
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Cập nhật giá vé" : "Thêm mới giá vé"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: ticketPriceMutation.isPending,
      }}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={getInitialValues()}
      >
        <div className="grid grid-cols-2 gap-x-4 mt-4">
          <Form.Item<FieldType>
            name="versionCode"
            label="Mã phiên bản"
            rules={[{ required: true, message: "Nhập tên mã phiên bản" }]}
          >
            <Input placeholder="Nhập mã phiên bản" />
          </Form.Item>
          <Form.Item<FieldType>
            name="positionId"
            label="Loại ghế"
            rules={[{ required: true, message: "Chọn loại ghế" }]}
          >
            <Select
              className="w-full"
              placeholder="Chọn loại ghế"
              options={seatTypesOptions}
              loading={isFetchingSeatTypes || isFetchingNextPageSeatTypes}
              onPopupScroll={(e) => {
                const target = e.target as HTMLElement;
                if (
                  hasNextPageSeatTypes &&
                  !isFetchingNextPageSeatTypes &&
                  target.scrollHeight - target.scrollTop <=
                    target.clientHeight + 50
                ) {
                  fetchNextPageSeatTypes();
                }
              }}
            />
          </Form.Item>
        </div>
        <Form.Item<FieldType>
          name="daypartId"
          label="Khung giờ"
          rules={[{ required: true, message: "Chọn khung giờ" }]}
        >
          <Select
            className="w-full"
            placeholder="Chọn khung giờ"
            options={daypartOptions}
            loading={isFetching || isFetchingNextPage}
            onPopupScroll={(e) => {
              const target = e.target as HTMLElement;
              if (
                hasNextPage &&
                !isFetchingNextPage &&
                target.scrollHeight - target.scrollTop <=
                  target.clientHeight + 50
              ) {
                fetchNextPage();
              }
            }}
          />
        </Form.Item>
        <Form.Item<FieldType>
          name="price"
          label="Giá vé"
          rules={[{ required: true, message: "Nhập giá vé" }]}
        >
          <InputNumber
            className="w-full"
            min={0}
            placeholder="Nhập giá vé"
            formatter={formatter}
            parser={(value) =>
              value?.replace(/\$\s?|(,*)/g, "") as unknown as number
            }
            suffix="đ"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TicketPriceDialog;
