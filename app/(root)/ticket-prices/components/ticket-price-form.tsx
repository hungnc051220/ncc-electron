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
  TicketPriceFormInput,
  ticketPriceFormSchema,
} from "@/lib/schemas/ticket-price-schema";
import { DayPartProps, SeatTypeProps } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDownIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import Select from "react-select";

interface TicketPriceFormProps {
  onSubmit: (values: TicketPriceFormInput) => void;
  defaultValues?: Partial<TicketPriceFormInput>;
  positions?: SeatTypeProps[];
  dayparts?: DayPartProps[];
}

const TicketPriceForm = ({
  onSubmit,
  defaultValues,
  positions = [],
  dayparts = [],
}: TicketPriceFormProps) => {
  const form = useForm<TicketPriceFormInput>({
    resolver: zodResolver(ticketPriceFormSchema),
    defaultValues: defaultValues || {
      versionCode: "",
      daypartId: undefined,
      positionId: undefined,
      price: 0,
    },
  });

  return (
    <div className="px-6 py-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} id="ticket-price-form">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="versionCode"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Mã phiên bản</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập mã phiên bản" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="positionId"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Loại ghế</FormLabel>
                  <Select
                    options={positions.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                    placeholder="Chọn loại ghế"
                    value={
                      field.value
                        ? {
                            value: field.value,
                            label: positions.find(
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
                          className="flex items-center min-h-9 gap-2 px-1 rounded-md border border-input bg-background text-sm focus-within:ring-2 focus-within:ring-ring"
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
                        border: "none",
                        boxShadow: "none",
                      }),
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="daypartId"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Khung giờ</FormLabel>
                <Select
                  options={dayparts.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                  placeholder="Chọn khung giờ"
                  value={
                    field.value
                      ? {
                          value: field.value,
                          label: dayparts.find(
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
                        className="flex items-center min-h-9 gap-2 px-1 rounded-md border border-input bg-background text-sm focus-within:ring-2 focus-within:ring-ring"
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
                      border: "none",
                      boxShadow: "none",
                    }),
                  }}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Giá vé</FormLabel>
                <FormControl>
                  <NumberInput
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Nhập giá vé"
                    suffix=" VNĐ"
                    thousandSeparator={","}
                  />
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

export default TicketPriceForm;
