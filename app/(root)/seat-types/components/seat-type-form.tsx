"use client";

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
import {
  SeatTypeFormInput,
  seatTypeFormSchema,
} from "@/lib/schemas/seat-type-schema";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ImageIcon, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { SketchPicker } from "react-color";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface SeatTypeFormProps {
  onSubmit: (values: SeatTypeFormInput) => void;
  defaultValues?: Partial<SeatTypeFormInput>;
}

const SeatTypeForm = ({ onSubmit, defaultValues }: SeatTypeFormProps) => {
  const form = useForm<SeatTypeFormInput>({
    resolver: zodResolver(seatTypeFormSchema),
    defaultValues: defaultValues || {
      positionCode: "",
      name: "",
      color: "#FFFFFF",
      pictureUrl: "",
      isSeat: true,
      isDefault: false,
    },
  });

  const [previewImage, setPreviewImage] = useState<string | null>(
    defaultValues?.pictureUrl || null
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
      form.setValue("pictureUrl", imageUrl);
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

  const color = form.watch("color");

  return (
    <div className="px-6 py-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} id="seat-type-form">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="positionCode"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Mã vị trí</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập mã vị trí" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Loại ghế, vị trí</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập loại ghế, vị trí" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormField
                control={form.control}
                name="isSeat"
                render={({ field }) => (
                  <FormItem className="w-full gap-0">
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="isSeat"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="isSeat" className="text-sm">
                          Là ghế ngồi
                        </Label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="w-full gap-0">
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="isDefault"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="isDefault" className="text-sm">
                          Là vị trí mặc định
                        </Label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <p className="text-sm font-medium leading-3.5 mb-2">Màu ghế</p>
              <Popover>
                <PopoverTrigger asChild>
                  <div
                    className="w-15 h-9 rounded-md border"
                    style={{ backgroundColor: color }}
                  ></div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2 bg-transparent border-none shadow-none" align="start">
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormControl>
                          <SketchPicker
                            color={field.value}
                            onChange={(color) => field.onChange(color.hex)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <FormField
            control={form.control}
            name="pictureUrl"
            render={() => (
              <FormItem>
                <FormLabel>Ảnh trên website</FormLabel>
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
                              <p className="text-xs mt-2">Đang upload...</p>
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
        </form>
      </Form>
    </div>
  );
};

export default SeatTypeForm;
