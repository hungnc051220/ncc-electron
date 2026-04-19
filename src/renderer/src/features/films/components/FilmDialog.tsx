import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import { filmCategoriesApi } from "@renderer/api/filmCategories.api";
import { manufacturersApi } from "@renderer/api/manufacturers.api";
import type { UploadRequestOption } from "@rc-component/upload/lib/interface";
import { useCreateFilm } from "@renderer/hooks/films/useCreateFilm";
import { useUpdateFilm } from "@renderer/hooks/films/useUpdateFilm";
import { useInfiniteSelectOptions } from "@renderer/hooks/useInfiniteSelectOptions";
import { useUploadImage } from "@renderer/hooks/useUploadImage";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { formatter } from "@renderer/lib/utils";
import {
  CountryProps,
  FilmProps,
  FilmStatusProps,
  FilmVersionProps,
  FilmLanguageProps
} from "@shared/types";
import type { FormProps, GetProp, UploadProps } from "antd";
import { Checkbox, DatePicker, Form, Image, Input, InputNumber, Modal, Select, Upload } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useEffect } from "react";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

type FileType = Parameters<GetProp<UploadProps, "beforeUpload">>[0];

const ageAboveOptions = [
  {
    value: 0,
    label: "K"
  },
  {
    value: 1,
    label: "P"
  },
  {
    value: 13,
    label: "T13"
  },
  {
    value: 16,
    label: "T16"
  },
  {
    value: 18,
    label: "T18"
  }
];

const ageAboveLabelMap = {
  0: "Phim được phổ biến đến người xem dưới 13 tuổi và có người bảo hộ đi kèm",
  1: "Phim được phép phổ biến đến người xem ở mọi độ tuổi",
  13: "Phim được phổ biến đến người xem từ đủ 13 tuổi trở lên (13+)",
  16: "Phim được phổ biến đến người xem từ đủ 16 tuổi trở lên (16+)",
  18: "Phim được phổ biến đến người xem từ đủ 18 tuổi trở lên (18+)"
};

export interface FieldValues {
  id?: number;
  filmName: string;
  filmNameEn?: string;
  versionCode?: string;
  manufacturerId?: number;
  countryId?: number;
  premieredDay: Dayjs;
  languageCode?: string;
  duration?: number;
  director?: string;
  actors?: string;
  introduction?: string;
  holding?: string;
  description?: string;
  sellOnline?: boolean;
  metaDescription?: string;
  metaKeyword?: string;
  metaTitle?: string;
  limitedToStores?: boolean;
  subjectToAcl?: boolean;
  published?: boolean;
  deleted?: boolean;
  pictureId?: number;
  imageUrl?: string;
  videoUrl?: string;
  statusCode?: string;
  proposedPrice?: number;
  trailerOnHomePage?: boolean;
  isHot?: boolean;
  showOnHomePage?: boolean;
  ageAbove?: number;
  orderNo?: number;
  sellOnlineBefore?: number;
  isFree?: boolean;
  categoryIds?: number[];
}

interface FilmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFilm?: FilmProps | null;
  versions: FilmVersionProps[];
  countries: CountryProps[];
  languages: FilmLanguageProps[];
  filmStatuses: FilmStatusProps[];
}

const FilmDialog = ({
  open,
  onOpenChange,
  editingFilm,
  versions,
  countries,
  languages,
  filmStatuses
}: FilmDialogProps) => {
  const { message } = useAntdApp();

  const [form] = Form.useForm();
  const isEdit = !!editingFilm;

  const manufacturerSelect = useInfiniteSelectOptions({
    queryKey: ["manufacturers"],
    queryFn: ({ pageParam, searchText }) =>
      manufacturersApi.getAll({
        current: pageParam,
        pageSize: 20,
        name: searchText,
        isHidden: false,
        sort: "name.asc"
      }),
    mapOption: (item) => ({
      value: item.id,
      label: item.fullName
    }),
    prefetchAll: true
  });

  const categorySelect = useInfiniteSelectOptions({
    queryKey: ["film-categories"],
    queryFn: ({ pageParam, searchText }) =>
      filmCategoriesApi.getAll({
        current: pageParam,
        pageSize: 20,
        name: searchText,
        published: true,
        sort: "name.asc"
      }),
    mapOption: (item) => ({
      value: item.id,
      label: item.name
    }),
    prefetchAll: true
  });

  const createFilm = useCreateFilm();
  const updateFilm = useUpdateFilm();
  const uploadImage = useUploadImage();

  const imageUrl = form.getFieldValue("imageUrl");
  const sellOnline = Form.useWatch("sellOnline", form);
  const ageAbove = Form.useWatch("ageAbove", form);

  useEffect(() => {
    if (ageAbove !== undefined) {
      form.setFieldValue("description", ageAboveLabelMap[ageAbove]);
    }
  });

  useEffect(() => {
    if (!sellOnline) {
      form.setFieldValue("sellOnlineBefore", 0);
    }
  }, [form, sellOnline]);

  const onOk = () => form.submit();

  const handleUpload = async (options: UploadRequestOption) => {
    const { file, onSuccess, onError } = options;

    try {
      if (!(file instanceof File)) {
        throw new Error("File không hợp lệ");
      }
      const imageUrl = await uploadImage.mutateAsync(file);
      onSuccess?.(imageUrl);
      form.setFieldValue("imageUrl", imageUrl);
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Tải ảnh lên thất bại"));
      onError?.(error as Error);
    }
  };

  const getInitialValues = (): FieldValues | undefined => {
    if (!editingFilm) {
      return {
        filmName: "",
        premieredDay: dayjs(),
        duration: 1,
        proposedPrice: 0,
        isFree: false,
        isHot: true,
        sellOnline: true,
        sellOnlineBefore: 0,
        showOnHomePage: true,
        versionCode: versions.length > 0 ? versions[0].versionCode : undefined,
        countryId: undefined,
        languageCode: languages.length > 0 ? languages[0].languageCode : undefined,
        statusCode: filmStatuses.length > 0 ? filmStatuses[0].statusCode : undefined,
        published: true,
        trailerOnHomePage: false,
        categoryIds: []
      };
    }

    return {
      filmName: editingFilm.filmName,
      filmNameEn: editingFilm.filmNameEn,
      videoUrl: editingFilm.videoUrl,
      duration: editingFilm.duration,
      director: editingFilm.director,
      actors: editingFilm.actors,
      introduction: editingFilm.introduction,
      manufacturerId: editingFilm.manufacturerId,
      versionCode: editingFilm.versionCode,
      statusCode: editingFilm.statusCode,
      languageCode: editingFilm.languageCode,
      description: editingFilm.description,
      sellOnline: editingFilm.sellOnline,
      published: editingFilm.published,
      premieredDay: dayjs(editingFilm.premieredDay),
      showOnHomePage: editingFilm.showOnHomePage,
      isHot: editingFilm.isHot === 1 ? true : false,
      ageAbove: editingFilm.ageAbove,
      proposedPrice: editingFilm.proposedPrice,
      trailerOnHomePage: editingFilm.trailerOnHomePage,
      orderNo: editingFilm.orderNo || 0,
      sellOnlineBefore: editingFilm.sellOnlineBefore,
      isFree: editingFilm.isFree,
      categoryIds: editingFilm.categories.map((item) => item.id) || [],
      imageUrl: editingFilm.imageUrl || "",
      countryId: editingFilm.countryId
    };
  };

  useEffect(() => {
    if (editingFilm?.imageUrl) {
      form.setFieldValue("imageUrl", editingFilm.imageUrl);
    }
  }, [editingFilm, form]);

  const onFinish: FormProps<FieldValues>["onFinish"] = (values: FieldValues) => {
    if (!isEdit) {
      createFilm.mutate(
        { ...values, premieredDay: values["premieredDay"].format("YYYY-MM-DD"), orderNo: 0 },
        {
          onSuccess: () => {
            message.success("Thêm phim thành công");
            onOpenChange(false);
          },
          onError: (error: unknown) => {
            message.error(getApiErrorMessage(error, "Thêm phim thất bại"));
          }
        }
      );
    } else {
      updateFilm.mutate(
        {
          dto: {
            id: editingFilm.id,
            ...values,
            premieredDay: values["premieredDay"].format("YYYY-MM-DD")
          }
        },
        {
          onSuccess: () => {
            message.success("Cập nhật phim thành công");
            onOpenChange(false);
          },
          onError: (error: unknown) => {
            message.error(getApiErrorMessage(error, "Cập nhật phim thất bại"));
          }
        }
      );
    }
  };

  const beforeUpload = (file: FileType) => {
    const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png";
    if (!isJpgOrPng) {
      message.error("Chỉ có thể tải ảnh dạng JPG/PNG!");
      return Upload.LIST_IGNORE;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error("Ảnh phải nhỏ hơn 5MB!");
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const uploadButton = (
    <button
      className="film-dialog-upload-trigger flex h-full w-full flex-col items-center justify-center rounded-lg border-0 bg-transparent text-center"
      type="button"
    >
      {uploadImage.isPending ? <LoadingOutlined /> : <PlusOutlined />}
      <div className="mt-2 text-gray-500">{uploadImage.isPending ? "Đang tải" : "Chọn ảnh"}</div>
    </button>
  );

  return (
    <Modal
      open={open}
      className="film-dialog-modal"
      title={isEdit ? "Cập nhật phim" : "Thêm mới phim"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: createFilm.isPending || updateFilm.isPending,
        disabled: uploadImage.isPending
      }}
      cancelButtonProps={{
        disabled: createFilm.isPending || updateFilm.isPending
      }}
      style={{ maxWidth: "calc(100vw - 24px)" }}
      width={1500}
      centered
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={getInitialValues()}>
        <Form.Item<FieldValues> name="imageUrl" hidden />

        <div className="[&_.ant-form-item]:mb-2.5">
          <div className="grid grid-cols-2 gap-3 items-stretch">
            <section className="h-full rounded-lg border border-app-border bg-app-bg-container px-3 py-2.5">
              <p className="mb-2 text-sm font-semibold">Thông tin cơ bản</p>
              <div className="grid grid-cols-2 gap-x-3">
                <Form.Item<FieldValues>
                  name="filmName"
                  label="Tên phim"
                  rules={[{ required: true, message: "Hãy nhập tên phim" }]}
                >
                  <Input placeholder="Nhập tên phim" />
                </Form.Item>
                <Form.Item<FieldValues> name="filmNameEn" label="Tên tiếng Anh">
                  <Input placeholder="Nhập tên phim tiếng Anh" />
                </Form.Item>

                <Form.Item<FieldValues> name="versionCode" label="Phiên bản">
                  <Select
                    className="w-full"
                    placeholder="Chọn phiên bản"
                    options={versions?.map((item) => ({
                      value: item.versionCode,
                      label: item.versionName
                    }))}
                  />
                </Form.Item>
                <Form.Item<FieldValues> name="statusCode" label="Trạng thái">
                  <Select
                    className="w-full"
                    placeholder="Chọn trạng thái phim"
                    options={filmStatuses?.map((item) => ({
                      value: item.statusCode,
                      label: item.statusName
                    }))}
                  />
                </Form.Item>

                <Form.Item<FieldValues> name="ageAbove" label="Độ tuổi">
                  <Select placeholder="Chọn tuổi yêu cầu từ" options={ageAboveOptions} />
                </Form.Item>
                <Form.Item<FieldValues> name="premieredDay" label="Ngày khởi chiếu">
                  <DatePicker className="w-full" format="DD/MM/YYYY" />
                </Form.Item>

                <Form.Item<FieldValues>
                  name="duration"
                  label="Thời lượng (phút)"
                  rules={[{ required: true, message: "Nhập thời lượng phim" }]}
                >
                  <InputNumber className="w-full" min={1} placeholder="Nhập thời lượng" />
                </Form.Item>
                <Form.Item<FieldValues>
                  name="categoryIds"
                  className="mb-0"
                  rules={[{ required: true, message: "Chọn ít nhất 1 thể loại" }]}
                  label="Thể loại phim"
                >
                  <Select
                    mode="multiple"
                    placeholder="Chọn thể loại"
                    showSearch={{
                      filterOption: false,
                      onSearch: categorySelect.onSearch
                    }}
                    loading={categorySelect.loading}
                    options={categorySelect.options}
                    onPopupScroll={categorySelect.onPopupScroll}
                    onClear={categorySelect.onClear}
                    allowClear
                    maxTagCount="responsive"
                  />
                </Form.Item>
              </div>
            </section>

            <section className="h-full rounded-lg border border-app-border bg-app-bg-container px-3 py-2.5">
              <p className="mb-2 text-sm font-semibold">Sản xuất và phát hành</p>
              <div className="grid grid-cols-2 gap-x-3">
                <Form.Item<FieldValues> name="countryId" label="Nước sản xuất">
                  <Select
                    className="w-full"
                    placeholder="Chọn nước sản xuất"
                    showSearch={{
                      optionFilterProp: "label",
                      filterSort: (optionA, optionB) =>
                        (optionA?.label ?? "")
                          .toLowerCase()
                          .localeCompare((optionB?.label ?? "").toLowerCase())
                    }}
                    options={countries?.map((item) => ({
                      value: item.id,
                      label: item.name
                    }))}
                  />
                </Form.Item>
                <Form.Item<FieldValues> name="manufacturerId" label="Hãng phát hành">
                  <Select
                    className="w-full"
                    placeholder="Chọn hãng phát hành"
                    showSearch={{
                      filterOption: false,
                      onSearch: manufacturerSelect.onSearch
                    }}
                    loading={manufacturerSelect.loading}
                    options={manufacturerSelect.options}
                    onPopupScroll={manufacturerSelect.onPopupScroll}
                    onClear={manufacturerSelect.onClear}
                    allowClear
                  />
                </Form.Item>

                <Form.Item<FieldValues> name="languageCode" label="Ngôn ngữ, phụ đề">
                  <Select
                    className="w-full"
                    placeholder="Chọn ngôn ngữ, phụ đề"
                    options={languages?.map((item) => ({
                      value: item.languageCode,
                      label: item.languageName
                    }))}
                  />
                </Form.Item>
                <Form.Item<FieldValues> name="director" label="Đạo diễn">
                  <Input placeholder="Nhập đạo diễn" />
                </Form.Item>

                <Form.Item<FieldValues>
                  name="actors"
                  label="Diễn viên chính"
                  className="col-span-2"
                >
                  <Input placeholder="Nhập diễn viên chính" />
                </Form.Item>

                <Form.Item<FieldValues>
                  name="videoUrl"
                  label="URL file video"
                  className="col-span-2"
                  rules={[{ required: true, message: "Nhập URL file video" }]}
                >
                  <Input placeholder="Nhập URL file video" />
                </Form.Item>
              </div>
            </section>
          </div>

          <div
            className="mt-3 grid gap-3 items-stretch"
            style={{
              gridTemplateColumns: "calc(50% - 0.375rem) calc(30% - 0.675rem) calc(20% - 0.45rem)"
            }}
          >
            <section className="h-full rounded-lg border border-app-border bg-app-bg-container px-3 py-2.5">
              <p className="mb-2 text-sm font-semibold">Mô tả nội dung</p>
              <Form.Item<FieldValues> name="description" label="Khuyến cáo">
                <Input.TextArea rows={1} placeholder="Nhập khuyến cáo" />
              </Form.Item>
              <Form.Item<FieldValues> name="introduction" label="Tóm tắt nội dung">
                <Input.TextArea rows={3} placeholder="Nhập tóm tắt nội dung" />
              </Form.Item>
            </section>

            <section className="h-full rounded-lg border border-app-border bg-app-bg-container px-3 py-2.5">
              <p className="mb-2 text-sm font-semibold">Cấu hình phim</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Form.Item<FieldValues> name="isHot" noStyle valuePropName="checked">
                    <Checkbox>Phim hot</Checkbox>
                  </Form.Item>
                  <Form.Item<FieldValues> name="isFree" noStyle valuePropName="checked">
                    <Checkbox>Phim miễn phí</Checkbox>
                  </Form.Item>
                  <Form.Item<FieldValues> name="sellOnline" noStyle valuePropName="checked">
                    <Checkbox>Bán online</Checkbox>
                  </Form.Item>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Form.Item dependencies={["sellOnline"]} noStyle>
                    {({ getFieldValue }) => {
                      const enabled = getFieldValue("sellOnline");
                      return (
                        <Form.Item<FieldValues> name="sellOnlineBefore" label="Bán trước">
                          <InputNumber
                            className="w-full"
                            min={0}
                            placeholder="Nhập số ngày"
                            disabled={!enabled}
                            suffix="ngày"
                          />
                        </Form.Item>
                      );
                    }}
                  </Form.Item>
                  <Form.Item<FieldValues> name="proposedPrice" label="Giá cộng thêm">
                    <InputNumber
                      className="w-full"
                      min={0}
                      placeholder="Nhập giá cộng thêm"
                      formatter={formatter}
                      parser={(value) => Number(value?.replace(/\$\s?|(,*)/g, "") || 0)}
                      suffix="đ"
                    />
                  </Form.Item>
                </div>
                <Form.Item<FieldValues> name="showOnHomePage" noStyle valuePropName="checked">
                  <Checkbox className="w-full">Hiển thị trên trang chủ</Checkbox>
                </Form.Item>
                <Form.Item<FieldValues> name="trailerOnHomePage" noStyle valuePropName="checked">
                  <Checkbox className="w-full">Hiển thị trailer trên trang chủ</Checkbox>
                </Form.Item>
                <Form.Item<FieldValues> name="published" noStyle valuePropName="checked">
                  <Checkbox className="w-full">Xuất bản</Checkbox>
                </Form.Item>
              </div>
            </section>

            <section className="rounded-lg border border-app-border bg-app-bg-container px-3 py-2.5">
              <p className="mb-2 text-sm font-semibold">Ảnh phim</p>
              <Form.Item label={null} className="film-dialog-image-box mb-0">
                <Upload
                  showUploadList={false}
                  accept="image/png,image/jpeg"
                  listType="picture-card"
                  customRequest={handleUpload}
                  beforeUpload={beforeUpload}
                >
                  {imageUrl ? (
                    <Image
                      width={180}
                      alt="film image"
                      src={imageUrl}
                      className="rounded-lg border border-app-border object-cover"
                      preview={false}
                    />
                  ) : (
                    uploadButton
                  )}
                </Upload>
              </Form.Item>
            </section>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default FilmDialog;
