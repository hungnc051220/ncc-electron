"use client";

import { formatter } from "@/lib/utils";
import {
  ApiResponse,
  CountryProps,
  FilmCategoryProps,
  FilmProps,
  FilmStatusProps,
  FilmVersionProps,
  LanguageProps,
  ManufacturerProps,
} from "@/types";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormProps, GetProp, UploadProps } from "antd";
import {
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Upload,
} from "antd";
import axios from "axios";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

type FileType = Parameters<GetProp<UploadProps, "beforeUpload">>[0];

type FieldType = {
  filmName: string;
  filmNameEn?: string;
  versionCode?: string;
  manufacturerId?: number;
  countryId?: number;
  premieredDay?: Dayjs;
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
};

interface FilmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFilm?: FilmProps | null;
  versions: FilmVersionProps[];
  manufactureres: ManufacturerProps[];
  countries: CountryProps[];
  languages: LanguageProps[];
  filmStatuses: FilmStatusProps[];
}

const FilmDialog = ({
  open,
  onOpenChange,
  editingFilm,
  versions,
  manufactureres,
  countries,
  languages,
  filmStatuses,
}: FilmDialogProps) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = !!editingFilm;
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      fetch("/api/categories?pageSize=100").then(
        (res) => res.json() as Promise<ApiResponse<FilmCategoryProps>>,
      ),
  });

  const filmMutation = useMutation({
    mutationFn: (data: FieldType) => {
      if (!isEdit) {
        return axios.post("/api/film/create", {
          ...data,
          premieredDay: dayjs(data.premieredDay).format("YYYY-MM-DD"),
        });
      } else {
        return axios.post("/api/film/update", {
          ...data,
          id: editingFilm.id,
          premieredDay: dayjs(data.premieredDay).format("YYYY-MM-DD"),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["films"] });
      toast.success(
        `${isEdit ? "Cập nhật thông tin" : "Thêm"} phim thành công`,
      );
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  const onOk = () => form.submit();

  const getInitialValues = (): FieldType | undefined => {
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
        countryId: countries.length > 0 ? countries[0].id : undefined,
        manufacturerId:
          manufactureres.length > 0 ? manufactureres[0].id : undefined,
        languageCode:
          languages.length > 0 ? languages[0].languageCode : undefined,
        statusCode:
          filmStatuses.length > 0 ? filmStatuses[0].statusCode : undefined,
        published: true,
        ageAbove: 0,
        orderNo: 0,
        trailerOnHomePage: false,
        categoryIds: [],
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
      premieredDay: editingFilm.premieredDay
        ? dayjs(editingFilm.premieredDay)
        : undefined,
      showOnHomePage: editingFilm.showOnHomePage,
      isHot: editingFilm.isHot === 1 ? true : false,
      ageAbove: editingFilm.ageAbove,
      proposedPrice: editingFilm.proposedPrice,
      trailerOnHomePage: editingFilm.trailerOnHomePage,
      orderNo: editingFilm.orderNo,
      sellOnlineBefore: editingFilm.sellOnlineBefore,
      isFree: editingFilm.isFree,
      categoryIds: editingFilm.categories.map((item) => item.id) || [],
      imageUrl: editingFilm.imageUrl || "",
      countryId: editingFilm.countryId,
    };
  };

  if (editingFilm && !imageUrl && editingFilm.imageUrl) {
    setImageUrl(editingFilm.imageUrl);
    form.setFieldValue("imageUrl", editingFilm.imageUrl);
  }

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    filmMutation.mutate(values);
  };

  const beforeUpload = (file: FileType) => {
    const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png";
    if (!isJpgOrPng) {
      toast.error("Chỉ có thể tải ảnh dạng JPG/PNG!");
    }
    const isLt2M = file.size / 1024 / 1024 < 5;
    if (!isLt2M) {
      toast.error("Ảnh phải nhỏ hơn 5MB!");
    }
    return isJpgOrPng && isLt2M;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normFile = (e: any) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e?.fileList;
  };

  const uploadButton = (
    <button className="border-none bg-none" type="button">
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div className="mt-2 text-gray-500">
        {loading ? "Đang tải" : "Chọn ảnh"}
      </div>
    </button>
  );

  const handleChange: UploadProps["onChange"] = (info) => {
    if (info.file.status === "uploading") {
      setLoading(true);
      return;
    }
    if (info.file.status === "done") {
      form.setFieldValue("imageUrl", info.file.response.imageUrl);
      setImageUrl(info.file.response.imageUrl);
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Cập nhật phim" : "Thêm mới phim"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: filmMutation.isPending,
      }}
      width={960}
      centered
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={getInitialValues()}
        className="h-[80vh] overflow-y-auto"
      >
        <div className="flex gap-6">
          <div className="flex-1 grid grid-cols-2 gap-x-4 mt-4">
            <Form.Item<FieldType>
              name="filmName"
              label="Tên phim"
              rules={[{ required: true, message: "Hãy nhập tên phim" }]}
            >
              <Input placeholder="Nhập tên phim" />
            </Form.Item>
            <Form.Item<FieldType> name="filmNameEn" label="Tên phim tiếng Anh">
              <Input placeholder="Nhập tên phim tiếng Anh" />
            </Form.Item>

            <Form.Item<FieldType> name="versionCode" label="Phiên bản">
              <Select
                className="w-full"
                placeholder="Chọn phiên bản"
                options={versions?.map((item) => ({
                  value: item.versionCode,
                  label: item.versionName,
                }))}
              />
            </Form.Item>

            <Form.Item<FieldType> name="countryId" label="Nước sản xuất">
              <Select
                className="w-full"
                placeholder="Chọn nước sản xuất"
                options={countries?.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
            </Form.Item>

            <Form.Item<FieldType> name="manufacturerId" label="Hãng phát hành">
              <Select
                className="w-full"
                placeholder="Chọn hãng phát hành"
                options={manufactureres?.map((item) => ({
                  value: item.id,
                  label: item.fullName,
                }))}
              />
            </Form.Item>

            <Form.Item<FieldType> name="premieredDay" label="Ngày khởi chiếu">
              <DatePicker className="w-full" format="DD/MM/YYYY" />
            </Form.Item>

            <Form.Item<FieldType> name="languageCode" label="Ngôn ngữ, phụ đề">
              <Select
                className="w-full"
                placeholder="Chọn ngôn ngữ, phụ đề"
                options={languages?.map((item) => ({
                  value: item.languageCode,
                  label: item.languageName,
                }))}
              />
            </Form.Item>

            <Form.Item<FieldType>
              name="duration"
              label="Thời lượng (phút)"
              rules={[{ required: true, message: "Nhập thời lượng phim" }]}
            >
              <InputNumber
                className="w-full"
                min={1}
                placeholder="Nhập thời lượng (phút)"
              />
            </Form.Item>

            <Form.Item<FieldType> name="director" label="Đạo diễn">
              <Input placeholder="Nhập đạo diễn" />
            </Form.Item>

            <Form.Item<FieldType> name="actors" label="Diễn viên chính">
              <Input placeholder="Nhập diễn viên chính" />
            </Form.Item>

            <Form.Item<FieldType> name="statusCode" label="Trạng thái phim">
              <Select
                className="w-full"
                placeholder="Chọn trạng thái phim"
                options={filmStatuses?.map((item) => ({
                  value: item.statusCode,
                  label: item.statusName,
                }))}
              />
            </Form.Item>

            <Form.Item<FieldType> name="proposedPrice" label="Giá cộng thêm">
              <InputNumber
                className="w-full"
                min={0}
                placeholder="Nhập giá cộng thêm"
                formatter={formatter}
                parser={(value) =>
                  value?.replace(/\$\s?|(,*)/g, "") as unknown as number
                }
                suffix="đ"
              />
            </Form.Item>

            <Form.Item<FieldType>
              name="videoUrl"
              label="URL file video"
              className="col-span-2"
              rules={[{ required: true, message: "Nhập URL file video" }]}
            >
              <Input placeholder="Nhập URL file video" />
            </Form.Item>

            <Form.Item<FieldType> name="ageAbove" label="Tuổi yêu cầu từ">
              <InputNumber
                className="w-full"
                min={0}
                max={100}
                placeholder="Nhập tuổi yêu cầu từ"
              />
            </Form.Item>
            <Form.Item<FieldType> name="orderNo" label="Thứ tự hiển thị">
              <InputNumber
                className="w-full"
                min={0}
                max={100}
                placeholder="Nhập thứ tự hiển thị"
              />
            </Form.Item>

            <Form.Item<FieldType> name="imageUrl" hidden />

            <Form.Item
              label="Ảnh"
              valuePropName="fileList"
              getValueFromEvent={normFile}
              className="col-span-2"
            >
              <Upload
                listType="picture-card"
                showUploadList={false}
                maxCount={1}
                action="/api/upload-image"
                beforeUpload={beforeUpload}
                onChange={handleChange}
              >
                {imageUrl && !loading ? (
                  <Image
                    src={imageUrl}
                    alt="avatar"
                    width={200}
                    height={200}
                    className="w-full rounded-md p-1 object-cover object-center"
                  />
                ) : (
                  uploadButton
                )}
              </Upload>
            </Form.Item>

            <Form.Item<FieldType>
              name="description"
              label="Khuyến cáo"
              className="col-span-2"
            >
              <Input.TextArea rows={5} placeholder="Nhập khuyến cáo" />
            </Form.Item>

            <Form.Item<FieldType>
              name="introduction"
              label="Tóm tắt nội dung"
              className="col-span-2"
            >
              <Input.TextArea rows={5} placeholder="Nhập tóm tắt nội dung" />
            </Form.Item>
          </div>

          <div className="w-[300px]">
            <div className="bg-goku rounded-lg py-3 px-4">
              <p className="font-semibold mb-2 text-sm">Cấu hình phim</p>
              <div className="space-y-1.5">
                <Form.Item<FieldType>
                  name="isHot"
                  noStyle
                  valuePropName="checked"
                >
                  <Checkbox className="w-full">Phim hot</Checkbox>
                </Form.Item>
                <Form.Item<FieldType>
                  name="isFree"
                  noStyle
                  valuePropName="checked"
                >
                  <Checkbox className="w-full">Phim miễn phí</Checkbox>
                </Form.Item>
                <Form.Item<FieldType>
                  name="sellOnline"
                  noStyle
                  valuePropName="checked"
                >
                  <Checkbox className="w-full">Bán online</Checkbox>
                </Form.Item>
                <Form.Item dependencies={["sellOnline"]} noStyle>
                  {({ getFieldValue }) => {
                    const enabled = getFieldValue("sellOnline");
                    if (!enabled) {
                      form.setFieldValue("sellOnlineBefore", 0);
                    }
                    return (
                      <Form.Item<FieldType> name="sellOnlineBefore" noStyle>
                        <InputNumber
                          className="w-full"
                          min={0}
                          placeholder="Nhập số ngày"
                          disabled={!enabled}
                        />
                      </Form.Item>
                    );
                  }}
                </Form.Item>
                <Form.Item<FieldType>
                  name="showOnHomePage"
                  noStyle
                  valuePropName="checked"
                >
                  <Checkbox className="w-full">
                    Hiển thị trên trang chủ
                  </Checkbox>
                </Form.Item>
                <Form.Item<FieldType>
                  name="trailerOnHomePage"
                  noStyle
                  valuePropName="checked"
                >
                  <Checkbox className="w-full">
                    Hiển thị trailer trên trang chủ
                  </Checkbox>
                </Form.Item>
                <Form.Item<FieldType>
                  name="published"
                  noStyle
                  valuePropName="checked"
                >
                  <Checkbox>Xuất bản</Checkbox>
                </Form.Item>
              </div>
            </div>
            <div className="bg-goku rounded-lg py-3 px-4 mt-4">
              <p className="font-semibold mb-2 text-sm">Thể loại phim</p>
              <div className="space-y-1.5">
                <Form.Item<FieldType> name="categoryIds" rules={[{required: true, message: "Chọn ít nhất 1 thể loại"}]}>
                  <Checkbox.Group>
                    {categories?.data?.map((category) => (
                      <div key={category.id} className="mb-1 w-full">
                        <Checkbox value={category.id}>{category.name}</Checkbox>
                      </div>
                    ))}
                  </Checkbox.Group>
                </Form.Item>
              </div>
            </div>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default FilmDialog;
