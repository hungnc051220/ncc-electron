"use client";

import { Checkbox } from "@/components/ui/checkbox";
import CustomDatePicker from "@/components/ui/custom-date-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  HolidayFormInput,
  holidayFormSchema,
} from "@/lib/schemas/holiday-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const DAYS_OF_WEEK = [
  { label: "Thứ 2", value: 1 },
  { label: "Thứ 3", value: 2 },
  { label: "Thứ 4", value: 3 },
  { label: "Thứ 5", value: 4 },
  { label: "Thứ 6", value: 5 },
  { label: "Thứ 7", value: 6 },
  { label: "Chủ nhật", value: 0 },
];

const SPECIAL_DAYS = [
  { label: "Ngày 14/2", value: "14/2" },
  { label: "Ngày 8/3", value: "8/3" },
  { label: "Ngày 30/4", value: "30/4" },
  { label: "Ngày 1/5", value: "1/5" },
  { label: "Ngày 2/9", value: "2/9" },
  { label: "Ngày 24/12", value: "24/12" },
];

interface HolidayFormProps {
  onSubmit: (values: HolidayFormInput) => void;
}

const HolidayForm = ({ onSubmit }: HolidayFormProps) => {
  const form = useForm<HolidayFormInput>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      daysInWeek: [],
      specialDates: [],
      specificDate: null,
    },
  });

  return (
    <div className="px-6 py-5">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          id="holiday-form"
          className="space-y-2"
        >
          <FormField
            control={form.control}
            name="daysInWeek"
            render={() => (
              <FormItem>
                <FormLabel className="mb-1">Ngày trong tuần</FormLabel>
                <div className="grid grid-cols-3 gap-3">
                  {DAYS_OF_WEEK.map((day) => (
                    <FormField
                      key={day.value}
                      control={form.control}
                      name="daysInWeek"
                      render={({ field }) => (
                        <FormItem
                          key={day.value}
                          className="flex flex-row items-center gap-2 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(day.value)}
                              onCheckedChange={(checked) => {
                                const current = field.value ?? [];

                                if (checked) {
                                  if (field.value) {
                                    field.onChange([...current, day.value]);
                                  }
                                } else {
                                  field.onChange(
                                    current.filter(
                                      (value) => value !== day.value
                                    )
                                  );
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {day.label}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="specialDates"
            render={() => (
              <FormItem>
                <FormLabel className="mb-1">Ngày đặc biệt</FormLabel>

                <div className="grid grid-cols-3 gap-3">
                  {SPECIAL_DAYS.map((day) => (
                    <FormField
                      key={day.value}
                      control={form.control}
                      name="specialDates"
                      render={({ field }) => (
                        <FormItem
                          key={day.value}
                          className="flex flex-row items-center gap-2 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(day.value)}
                              onCheckedChange={(checked) => {
                                const current = field.value ?? [];
                                if (checked) {
                                  field.onChange([...current, day.value]);
                                } else {
                                  field.onChange(
                                    current.filter(
                                      (value) => value !== day.value
                                    )
                                  );
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {day.label}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="specificDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="mb-1">Ngày cụ thể khác</FormLabel>
                <FormControl>
                  <CustomDatePicker
                    selectedDate={field.value}
                    onChangeDate={(date) => field.onChange(date)}
                    className="w-full"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
};

export default HolidayForm;
