import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { filmsApi } from "@renderer/api/films.api";
import { manufacturersApi } from "@renderer/api/manufacturers.api";
import { useCreateCancellationReason } from "@renderer/hooks/cancellationReasons/useCreateCancellationReason";
import { useUpdateCancellationReason } from "@renderer/hooks/cancellationReasons/useUpdateCancellationReason";
import { ApiError, CancellationReasonProps } from "@shared/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { FormProps, TimeRangePickerProps } from "antd";
import { Button, DatePicker, Form, InputNumber, message, Modal, Select, Space } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useMemo } from "react";

const { RangePicker } = DatePicker;

const rangePresets: TimeRangePickerProps["presets"] = [
  { label: "7 ngày trước", value: [dayjs().add(-7, "d"), dayjs()] },
  { label: "14 ngày trước", value: [dayjs().add(-14, "d"), dayjs()] },
  { label: "30 ngày trước", value: [dayjs().add(-30, "d"), dayjs()] },
  { label: "90 ngày trước", value: [dayjs().add(-90, "d"), dayjs()] }
];

type FieldType = {
  reason: string;
};

interface RevenueSharingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCancellationReason?: CancellationReasonProps | null;
}

const RevenueSharingDialog = ({
  open,
  onOpenChange,
  editingCancellationReason
}: RevenueSharingDialogProps) => {
  const [form] = Form.useForm();
  const isEdit = !!editingCancellationReason;

  const {
    data: manufacturers,
    fetchNextPage: fetchNextPageManufacturers,
    hasNextPage: hasNextPageManufacturers,
    isFetching: isFetchingManufacturers,
    isFetchingNextPage: isFetchingNextPageManufacturers
  } = useInfiniteQuery({
    queryKey: ["manufacturers"],
    queryFn: ({ pageParam = 1 }) => manufacturersApi.getAll({ current: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  const {
    data: films,
    fetchNextPage: fetchNextPageFilms,
    hasNextPage: hasNextPageFilms,
    isFetching: isFetchingFilms,
    isFetchingNextPage: isFetchingNextPageFilms
  } = useInfiniteQuery({
    queryKey: ["films"],
    queryFn: ({ pageParam = 1 }) => filmsApi.getAll({ current: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  const manufacturerOptions = useMemo(() => {
    return (
      manufacturers?.pages.flatMap((page) =>
        page.data.map((item) => ({
          value: item.id,
          label: item.name
        }))
      ) ?? []
    );
  }, [manufacturers]);

  const filmOptions = useMemo(() => {
    return (
      films?.pages.flatMap((page) =>
        page.data.map((item) => ({
          value: item.id,
          label: item.filmName
        }))
      ) ?? []
    );
  }, [films]);

  const createCancellationReason = useCreateCancellationReason();
  const updateCancellationReason = useUpdateCancellationReason();

  const onOk = () => form.submit();
  const onCancel = () => onOpenChange(false);

  const getInitialValues = (): FieldType | undefined => {
    if (!editingCancellationReason) {
      return {
        reason: ""
      };
    }
    return {
      reason: editingCancellationReason.reason
    };
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    if (!isEdit) {
      createCancellationReason.mutate(values, {
        onSuccess: () => {
          message.success("Thêm lý do hủy vé thành công");
          onCancel();
        },
        onError: (error: unknown) => {
          let msg = "Thêm lý do hủy vé thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
        }
      });
    } else {
      updateCancellationReason.mutate(
        {
          id: editingCancellationReason.id,
          dto: values
        },
        {
          onSuccess: () => {
            message.success("Cập nhật lý do hủy vé thành công");
            onCancel();
          },
          onError: (error: unknown) => {
            let msg = "Cập nhật lý do hủy vé thất bại";

            if (axios.isAxiosError<ApiError>(error)) {
              msg = error.response?.data?.message ?? msg;
            }

            message.error(msg);
          }
        }
      );
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Cập nhật" : "Thêm mới"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: createCancellationReason.isPending || updateCancellationReason.isPending
      }}
      cancelButtonProps={{
        disabled: createCancellationReason.isPending || updateCancellationReason.isPending
      }}
      width={800}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={getInitialValues()}>
        <div className="grid grid-cols-2 gap-x-3">
          <Form.Item name="manufacturerId" label="Hãng phim">
            <Select
              loading={isFetchingManufacturers || isFetchingNextPageManufacturers}
              options={manufacturerOptions}
              placeholder="Chọn hãng phim"
              onPopupScroll={(e) => {
                const target = e.target as HTMLElement;
                if (
                  hasNextPageManufacturers &&
                  !isFetchingNextPageManufacturers &&
                  target.scrollHeight - target.scrollTop <= target.clientHeight + 50
                ) {
                  fetchNextPageManufacturers();
                }
              }}
              allowClear
            />
          </Form.Item>

          <Form.Item name="filmId" label="Phim">
            <Select
              loading={isFetchingFilms || isFetchingNextPageFilms}
              options={filmOptions}
              placeholder="Chọn phim"
              onPopupScroll={(e) => {
                const target = e.target as HTMLElement;
                if (
                  hasNextPageFilms &&
                  !isFetchingNextPageFilms &&
                  target.scrollHeight - target.scrollTop <= target.clientHeight + 50
                ) {
                  fetchNextPageFilms();
                }
              }}
              allowClear
            />
          </Form.Item>
        </div>

        <div className="bg-primary/10 p-4 rounded-lg border border-dashed border-primary">
          <Form.List name="users">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Space
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%"
                    }}
                    align="baseline"
                  >
                    <p className="text-sm mr-4">Lần {index + 1}</p>
                    <Form.Item
                      {...restField}
                      label="Khoảng thời gian"
                      name={[name, "first"]}
                      rules={[{ required: true, message: "Missing first name" }]}
                    >
                      <RangePicker format="DD/MM/YYYY" presets={rangePresets} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      label="Phần trăm chủ phim"
                      name={[name, "last"]}
                      rules={[{ required: true, message: "Nhập % chủ phim" }]}
                    >
                      <InputNumber
                        placeholder="Nhập % chủ phim"
                        min={0}
                        max={100}
                        className="w-full"
                        suffix="%"
                      />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item noStyle>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Thêm số lần
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
