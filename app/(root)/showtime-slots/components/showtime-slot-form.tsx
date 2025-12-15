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
  ShowtimeSlotFormInput,
  showtimeSlotFormSchema,
} from "@/lib/schemas/showtime-slot-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDownIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import Select from "react-select";

interface ShowtimeSlotFormProps {
  onSubmit: (values: ShowtimeSlotFormInput) => void;
  defaultValues?: Partial<ShowtimeSlotFormInput>;
}

const dateTypeOptions = [
  { value: 1, label: "Ngày thường" },
  { value: 2, label: "Ngày lễ" },
];

const ShowtimeSlotForm = ({
  onSubmit,
  defaultValues,
}: ShowtimeSlotFormProps) => {
  const form = useForm<ShowtimeSlotFormInput>({
    resolver: zodResolver(showtimeSlotFormSchema),
    defaultValues: defaultValues || {
      dateTypeId: undefined,
      name: "",
      fromTime: "",
      toTime: "",
    },
    mode: "onChange",
  });

  return (
    <div className="px-6 py-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} id="showtime-slot-form">
          <FormField
            control={form.control}
            name="dateTypeId"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Ngày áp dụng</FormLabel>
                <Select
                  options={dateTypeOptions}
                  placeholder="Chọn loại ngày"
                  value={
                    field.value
                      ? {
                          value: field.value,
                          label: dateTypeOptions.find(
                            (item) => item.value === field.value
                          )?.label,
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
            name="name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Tên khung giờ</FormLabel>
                <FormControl>
                  <Input placeholder="Nhập tên khung giờ" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fromTime"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Thời gian bắt đầu</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      placeholder="Chọn thời gian bắt đầu"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        // Trigger validation for toTime when fromTime changes
                        if (form.getValues("toTime")) {
                          form.trigger("toTime");
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="toTime"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Thời gian kết thúc</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      placeholder="Chọn thời gian kết thúc"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ShowtimeSlotForm;
