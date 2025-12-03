"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import useGeneralData from "@/hooks/use-general-data";
import { FilmFormInput, filmFormSchema } from "@/lib/schemas/film-schema";
import { cn } from "@/lib/utils";
import { FilmCategoryProps } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon, ChevronDownIcon, ImageIcon, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Select from "react-select";
import { toast } from "sonner";

interface FilmFormProps {
  onSubmit: (values: FilmFormInput) => void;
  defaultValues?: Partial<FilmFormInput>;
}

const FilmForm = ({ onSubmit, defaultValues }: FilmFormProps) => {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      fetch("/api/categories?pageSize=100").then((res) => res.json()),
  });
  const data = useGeneralData((state) => state.data);
  const form = useForm<FilmFormInput>({
    resolver: zodResolver(filmFormSchema),
    defaultValues: defaultValues || {
      filmName: "",
      duration: 0,
      videoUrl: "",
      proposedPrice: 0,
      premieredDay: new Date(),
      versionCode: data?.filmVersions?.[0]?.versionCode || "2D",
      countryId: data?.countries?.[0]?.id || 1,
      manufacturerId: data?.manufacturers?.[0]?.id || 1,
      languageCode: data?.languages?.[0]?.languageCode || "LTV",
      statusCode: data?.filmStatuses?.[0]?.statusCode || "SHOWING",
      isHot: true,
      sellOnline: true,
      showOnHomePage: true,
      ageAbove: 0,
      orderNo: 0,
      categoryIds: [],
      published: false,
      trailerOnHomePage: false,
      imageUrl: "",
      introduction: "",
      actors: "",
      description: "",
      director: "",
      filmNameEn: "",
      sellOnlineBefore: 0,
    },
  });

  const [previewImage, setPreviewImage] = useState<string | null>(
    defaultValues?.imageUrl || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Tải ảnh thất bại");
      }

      return response.json();
    },
    onSuccess: (data) => {
      const imageUrl = data?.imageUrl || "";
      setPreviewImage(imageUrl);
      form.setValue("imageUrl", imageUrl);
    },
    onError: (error) => {
      console.error("Lỗi khi upload ảnh:", error);
      toast.error(`Lỗi khi upload ảnh: ${error.message}`);
    },
  });

  const handleImageUpload = (file: File) => {
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file ảnh");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Kích thước file không được vượt quá 5MB");
      return;
    }

    uploadImageMutation.mutate(file);
  };

  const handleImageClick = () => {
    if (!uploadImageMutation.isPending) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          id="film-form"
          className="h-full flex flex-col"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex gap-6 min-h-full">
              <div className="grid grid-cols-2 gap-4 flex-1 content-start">
                <FormField
                  control={form.control}
                  name="filmName"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="gap-1">
                        Tên phim<span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Nhập tên phim" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="filmNameEn"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Tên phim tiếng Anh</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nhập tên phim tiếng Anh"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="versionCode"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Phiên bản</FormLabel>
                      <Select
                        options={data?.filmVersions?.map((item) => ({
                          value: item.versionCode,
                          label: item.versionName,
                        }))}
                        value={
                          field.value
                            ? {
                                value: field.value,
                                label: data?.filmVersions?.find(
                                  (item) => item.versionCode === field.value
                                )?.versionName,
                              }
                            : null
                        }
                        placeholder="Phim 2D, 3D..."
                        onChange={(value) => field.onChange(value?.value)}
                        components={{
                          Control: ({ children, ...props }) => (
                            <div
                              ref={props.innerRef}
                              {...props.innerProps}
                              className="flex items-center min-h-9 gap-2 px-2.5 rounded-md border border-input bg-background text-sm focus-within:ring-2 focus-within:ring-ring"
                            >
                              {children}
                            </div>
                          ),
                          DropdownIndicator: () => (
                            <ChevronDownIcon className="size-4 text-gray-400 ml-2" />
                          ),
                          IndicatorSeparator: () => null,
                        }}
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: "unset",
                            height: "unset",
                            boxShadow: "none",
                            border: "none",
                          }),
                          valueContainer: (base) => ({
                            ...base,
                            padding: 0,
                            fontSize: "14px",
                          }),
                        }}
                        isSearchable
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="countryId"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Nước sản xuất</FormLabel>
                      <Select
                        options={data?.countries?.map((item) => ({
                          value: item.id,
                          label: item.name,
                        }))}
                        placeholder="Việt Nam"
                        value={
                          field.value
                            ? {
                                value: field.value,
                                label: data?.countries?.find(
                                  (item) => item.id === field.value
                                )?.name,
                              }
                            : null
                        }
                        onChange={(value) => field.onChange(value?.value)}
                        components={{
                          Control: ({ children, ...props }) => (
                            <div
                              ref={props.innerRef}
                              {...props.innerProps}
                              className="flex items-center min-h-9 gap-2 px-2.5 rounded-md border border-input bg-background text-sm focus-within:ring-2 focus-within:ring-ring"
                            >
                              {children}
                            </div>
                          ),
                          DropdownIndicator: () => (
                            <ChevronDownIcon className="size-4 text-gray-400 ml-2" />
                          ),
                          IndicatorSeparator: () => null,
                        }}
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: "unset",
                            height: "unset",
                            boxShadow: "none",
                            border: "none",
                          }),
                          valueContainer: (base) => ({
                            ...base,
                            padding: 0,
                            fontSize: "14px",
                          }),
                        }}
                        isSearchable
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="manufacturerId"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Hãng phát hành</FormLabel>
                      <Select
                        options={data?.manufacturers?.map((item) => ({
                          value: item.id,
                          label: item.name,
                        }))}
                        placeholder="Chọn hãng phát hành"
                        value={
                          field.value
                            ? {
                                value: field.value,
                                label: data?.manufacturers?.find(
                                  (item) => item.id === field.value
                                )?.name,
                              }
                            : null
                        }
                        onChange={(value) => field.onChange(value?.value)}
                        components={{
                          Control: ({ children, ...props }) => (
                            <div
                              ref={props.innerRef}
                              {...props.innerProps}
                              className="flex items-center min-h-9 gap-2 px-2.5 rounded-md border border-input bg-background text-sm focus-within:ring-2 focus-within:ring-ring"
                            >
                              {children}
                            </div>
                          ),
                          DropdownIndicator: () => (
                            <ChevronDownIcon className="size-4 text-gray-400 ml-2" />
                          ),
                          IndicatorSeparator: () => null,
                        }}
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: "unset",
                            height: "unset",
                            boxShadow: "none",
                            border: "none",
                          }),
                          valueContainer: (base) => ({
                            ...base,
                            padding: 0,
                            fontSize: "14px",
                          }),
                        }}
                        isSearchable
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="premieredDay"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Ngày khởi chiếu</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-9",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(new Date(field.value), "dd/MM/yyyy", {
                                  locale: vi,
                                })
                              ) : (
                                <span>Chọn ngày khởi chiếu</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              field.value ? new Date(field.value) : undefined
                            }
                            onSelect={(date) => {
                              field.onChange(date ? date.toISOString() : "");
                            }}
                            disabled={(date) => date < new Date("1900-01-01")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="languageCode"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Ngôn ngữ, phụ đề</FormLabel>
                      <Select
                        options={data?.languages?.map((item) => ({
                          value: item.languageCode,
                          label: item.languageName,
                        }))}
                        placeholder="Thuyết minh tiếng Việt"
                        value={
                          field.value
                            ? {
                                value: field.value,
                                label: data?.languages?.find(
                                  (item) => item.languageCode === field.value
                                )?.languageName,
                              }
                            : null
                        }
                        onChange={(value) => field.onChange(value?.value)}
                        components={{
                          Control: ({ children, ...props }) => (
                            <div
                              ref={props.innerRef}
                              {...props.innerProps}
                              className="flex items-center min-h-9 gap-2 px-2.5 rounded-md border border-input bg-background text-sm focus-within:ring-2 focus-within:ring-ring"
                            >
                              {children}
                            </div>
                          ),
                          DropdownIndicator: () => (
                            <ChevronDownIcon className="size-4 text-gray-400 ml-2" />
                          ),
                          IndicatorSeparator: () => null,
                        }}
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: "unset",
                            height: "unset",
                            boxShadow: "none",
                            border: "none",
                          }),
                          valueContainer: (base) => ({
                            ...base,
                            padding: 0,
                            fontSize: "14px",
                          }),
                        }}
                        isSearchable
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="gap-1">
                        Thời lượng phim (phút)
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="114"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="director"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Đạo diễn</FormLabel>
                      <FormControl>
                        <Input placeholder="Lê Văn Kiệt" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="statusCode"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Trạng thái phim</FormLabel>
                      <Select
                        options={data?.filmStatuses?.map((item) => ({
                          value: item.statusCode,
                          label: item.statusName,
                        }))}
                        placeholder="Đang chiếu, sắp chiếu..."
                        value={
                          field.value
                            ? {
                                value: field.value,
                                label: data?.filmStatuses?.find(
                                  (item) => item.statusCode === field.value
                                )?.statusName,
                              }
                            : null
                        }
                        onChange={(value) => field.onChange(value?.value)}
                        components={{
                          Control: ({ children, ...props }) => (
                            <div
                              ref={props.innerRef}
                              {...props.innerProps}
                              className="flex items-center min-h-9 gap-2 px-2.5 rounded-md border border-input bg-background text-sm focus-within:ring-2 focus-within:ring-ring"
                            >
                              {children}
                            </div>
                          ),
                          DropdownIndicator: () => (
                            <ChevronDownIcon className="size-4 text-gray-400 ml-2" />
                          ),
                          IndicatorSeparator: () => null,
                        }}
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: "unset",
                            height: "unset",
                            boxShadow: "none",
                            border: "none",
                          }),
                          valueContainer: (base) => ({
                            ...base,
                            padding: 0,
                            fontSize: "14px",
                          }),
                        }}
                        isSearchable
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actors"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Diễn viên chính</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="NSND Trung Anh, NSND Minh Châu, Lâm Thần..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="proposedPrice"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Giá cộng thêm</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="published"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="published"
                            checked={field.value as boolean}
                            onCheckedChange={field.onChange}
                          />
                          <Label htmlFor="published" className="text-sm">
                            Xuất bản
                          </Label>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="gap-1">
                        URL file video<span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://www.youtube.com/embed/hqraEl3zqu"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Khuyến cáo</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="T18 - Phim được phép biên người xem từ đủ 18 tuổi trở lên (18+)."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="introduction"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Tóm tắt nội dung</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Được truyền cảm hứng bởi câu chuyện thật 'Khúc hát đồ phong hiểu như trong tác phẩm'..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="w-[300px] flex flex-col gap-4 h-full">
                <div className="bg-goku rounded-lg py-3 px-4 shrink-0">
                  <p className="font-bold mb-3 text-sm xl:text-base">
                    Cấu hình phim
                  </p>
                  <div className="flex flex-col gap-2">
                    <FormField
                      control={form.control}
                      name="isHot"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="isHot"
                                checked={field.value === 1 ? true : false}
                                onCheckedChange={(value) =>
                                  field.onChange(value ? 1 : 0)
                                }
                              />
                              <Label htmlFor="isHot" className="text-sm">
                                Phim Hot
                              </Label>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isFree"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="isFree"
                                checked={field.value as boolean}
                                onCheckedChange={field.onChange}
                              />
                              <Label htmlFor="isFree" className="text-sm">
                                Phim miễn phí
                              </Label>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sellOnline"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="sellOnline"
                                checked={field.value as boolean}
                                onCheckedChange={field.onChange}
                              />
                              <Label htmlFor="sellOnline" className="text-sm">
                                Bán Online
                              </Label>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sellOnlineBefore"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-3 ml-5">
                              <Input
                                placeholder="Nhập ngày"
                                type="number"
                                {...field}
                                className="bg-white"
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                              />
                              <p className="text-sm">(Ngày)</p>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="showOnHomePage"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="showOnHomePage"
                                checked={field.value as boolean}
                                onCheckedChange={field.onChange}
                              />
                              <Label
                                htmlFor="showOnHomePage"
                                className="text-sm"
                              >
                                Hiện lên website
                              </Label>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="trailerOnHomePage"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="trailerOnHomePage"
                                checked={field.value as boolean}
                                onCheckedChange={field.onChange}
                              />
                              <Label
                                htmlFor="trailerOnHomePage"
                                className="text-sm"
                              >
                                Trailer trang chủ
                              </Label>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="bg-goku rounded-lg py-3 px-4 flex-1 flex flex-col min-h-0 max-h-[510px]">
                  <p className="font-bold mb-3 text-sm xl:text-base">
                    Thể loại phim
                  </p>
                  <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                    {(categories?.data as FilmCategoryProps[])?.map(
                      (category) => (
                        <FormField
                          key={category.id}
                          control={form.control}
                          name="categoryIds"
                          render={({ field }) => {
                            const currentCategories = field.value || [];
                            return (
                              <FormItem>
                                <FormControl>
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`category-${category.id}`}
                                      checked={currentCategories.some(
                                        (cat) => cat === category.id
                                      )}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([
                                            ...currentCategories,
                                            category.id,
                                          ]);
                                        } else {
                                          field.onChange(
                                            currentCategories.filter(
                                              (cat) => cat !== category.id
                                            )
                                          );
                                        }
                                      }}
                                    />
                                    <Label
                                      htmlFor={`category-${category.id}`}
                                      className="text-sm"
                                    >
                                      {category.name}
                                    </Label>
                                  </div>
                                </FormControl>
                              </FormItem>
                            );
                          }}
                        />
                      )
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ageAbove"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Tuổi yêu cầu từ</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="18"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="orderNo"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Thứ tự trên web</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="99"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={() => (
                    <FormItem>
                      <FormLabel>Ảnh phim</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div
                            className={cn(
                              "relative size-[136px] bg-goku rounded-lg border border-dashed border-gray-300 cursor-pointer hover:border-gray-400 transition-colors overflow-hidden",
                              uploadImageMutation.isPending &&
                                "opacity-50 cursor-not-allowed"
                            )}
                            onClick={handleImageClick}
                          >
                            {previewImage ? (
                              <Image
                                src={previewImage}
                                alt="Preview"
                                fill
                                className="object-cover rounded-lg"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                {uploadImageMutation.isPending ? (
                                  <>
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
                                    <p className="text-xs mt-2">
                                      Đang upload...
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <ImageIcon className="h-8 w-8 mb-2" />
                                    <p className="text-xs text-center">
                                      Click để chọn ảnh
                                    </p>
                                  </>
                                )}
                              </div>
                            )}

                            {previewImage && !uploadImageMutation.isPending && (
                              <div className="absolute inset-0 bg-black/50 bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                                <Upload className="h-6 w-6 text-white" />
                              </div>
                            )}
                          </div>

                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={uploadImageMutation.isPending}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default FilmForm;
