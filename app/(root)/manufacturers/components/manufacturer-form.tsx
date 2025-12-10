"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  ManufacturerFormInput,
  manufacturerFormSchema,
} from "@/lib/schemas/manufacturer-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

interface ManufacturerFormProps {
  onSubmit: (values: ManufacturerFormInput) => void;
  defaultValues?: Partial<ManufacturerFormInput>;
}

const ManufacturerForm = ({
  onSubmit,
  defaultValues,
}: ManufacturerFormProps) => {
  const form = useForm<ManufacturerFormInput>({
    resolver: zodResolver(manufacturerFormSchema),
    defaultValues: defaultValues || {
      name: "",
      fullName: "",
      bankName: "",
      phoneNumber: "",
      acountBank: "",
      addressBank: "",
      address: "",
      fax: "",
      url: "",
      manufacturerTemplateId: 1,
    },
  });

  return (
    <div className="px-6 py-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} id="manufacturer-form">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Tên hãng phim</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập tên hãng phim" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="acountBank"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Tài khoản ngân hàng</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập tài khoản ngân hàng" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Tên công ty</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập tên công ty" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Tên ngân hàng</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập tên ngân hàng" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Số điện thoại</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập số điện thoại" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="addressBank"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Địa chỉ ngân hàng</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập địa chỉ ngân hàng" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Địa chỉ</FormLabel>
                <FormControl>
                  <Input placeholder="Nhập địa chỉ" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fax"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Fax</FormLabel>
                <FormControl>
                  <Input placeholder="Nhập fax" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="Nhập website" {...field} />
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

export default ManufacturerForm;
