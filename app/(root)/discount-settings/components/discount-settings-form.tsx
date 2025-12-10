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
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DiscountFormInput,
  discountFormSchema,
} from "@/lib/schemas/discount-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

interface DiscountSettingsFormProps {
  onSubmit: (values: DiscountFormInput) => void;
  defaultValues?: Partial<DiscountFormInput>;
}

const DiscountSettingsForm = ({
  onSubmit,
  defaultValues,
}: DiscountSettingsFormProps) => {
  const form = useForm<DiscountFormInput>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: defaultValues || {
      discountType: "rate",
      discountName: "",
      discountAmount: undefined,
      discountRate: undefined,
    },
  });

  const discountType = form.watch("discountType");

  useEffect(() => {
    if (discountType === "amount") {
      form.setValue("discountRate", undefined);
    } else {
      form.setValue("discountAmount", undefined);
    }
  }, [discountType, form]);

  return (
    <div className="px-6 py-5">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          id="discount-settings-form"
        >
          <FormField
            control={form.control}
            name="discountName"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Tên khuyến mại, giảm giá</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nhập tên khuyến mại, giảm giá"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <FormField
              control={form.control}
              name="discountType"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Hình thức</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn hình thức" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="amount">Theo giá trị</SelectItem>
                          <SelectItem value="rate">Theo tỷ lệ (%)</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {discountType === "amount" && (
              <FormField
                control={form.control}
                name="discountAmount"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Giá trị</FormLabel>
                    <FormControl>
                      <NumberInput
                        placeholder="Nhập giá trị"
                        suffix=" VNĐ"
                        value={field.value}
                        onValueChange={field.onChange}
                        thousandSeparator={","}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {discountType === "rate" && (
              <FormField
                control={form.control}
                name="discountRate"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Giá trị</FormLabel>
                    <FormControl>
                      <NumberInput
                        placeholder="Nhập giá trị"
                        suffix="%"
                        value={field.value}
                        onValueChange={field.onChange}
                        min={0}
                        max={100}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export default DiscountSettingsForm;
