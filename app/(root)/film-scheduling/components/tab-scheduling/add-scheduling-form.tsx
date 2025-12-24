"use client";

import CustomDatePicker from "@/components/ui/custom-date-picker";
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
  getFilm,
  getPlanFilms,
  getPlanPricing,
  getScreeningRooms,
} from "@/data/loaders";
import {
  AddSchedulingFormInput,
  addSchedulingFormSchema,
} from "@/lib/schemas/add-scheduling-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { formatISO, setHours, setMinutes, setSeconds } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import queryString from "query-string";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import Select from "react-select";

function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [h, m] = time.split(":").map(Number);

  const totalMinutes = h * 60 + m + minutesToAdd;
  const newHours = Math.floor((totalMinutes / 60) % 24);
  const newMinutes = totalMinutes % 60;

  return `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")}`;
}

interface AddSchedulingFormProps {
  onSubmit: (values: AddSchedulingFormInput) => void;
  planCinemaId?: number;
}

const AddSchedulingForm = ({
  onSubmit,
  planCinemaId,
}: AddSchedulingFormProps) => {
  const form = useForm<AddSchedulingFormInput>({
    resolver: zodResolver(addSchedulingFormSchema),
    defaultValues: {
      projectDate: new Date(),
      priceOfPosition1: "",
      priceOfPosition2: "",
      priceOfPosition3: "",
      priceOfPosition4: "",
    },
  });

  const filmId = form.watch("filmId");
  const roomId = form.watch("roomId");
  const versionCode = form.watch("versionCode");
  const projectDate = form.watch("projectDate");
  const projectTime = form.watch("projectTime");

  const { isPending, data } = useQuery({
    queryKey: ["plan-film", planCinemaId],
    queryFn: () => {
      const query = queryString.stringify(
        {
          filter: JSON.stringify({ planCinemaId }),
          current: 1,
          pageSize: 100,
          sort: "order",
        },
        { skipEmptyString: true, skipNull: true }
      );
      return getPlanFilms(query);
    },
    enabled: !!planCinemaId,
  });

  const { isPending: isPendingRooms, data: rooms } = useQuery({
    queryKey: ["screening-rooms"],
    queryFn: () => {
      return getScreeningRooms({ page: 1, pageSize: 1000 });
    },
  });

  const { data: film } = useQuery({
    queryKey: ["film", filmId],
    queryFn: () => {
      return getFilm(filmId);
    },
    enabled: !!filmId,
  });

  const { data: planPricing, isError } = useQuery({
    queryKey: ["plan-pricing", roomId, versionCode, projectDate, projectTime],
    queryFn: () => {
      if (!roomId || !versionCode || !projectDate || !projectTime) return;
      const [hours, minutes] = projectTime.split(":").map(Number);
      const date = setSeconds(
        setMinutes(setHours(projectDate, hours), minutes),
        0
      );
      return getPlanPricing({ roomId, versionCode, date: formatISO(date) });
    },
    enabled:
      !!filmId && !!roomId && !!versionCode && !!projectDate && !!projectTime,
    retry: false,
  });

  useEffect(() => {
    if (planPricing) {
      form.setValue("priceOfPosition1", planPricing?.[0] || "");
      form.setValue("priceOfPosition2", planPricing?.[1] || "");
      form.setValue("priceOfPosition3", planPricing?.[2] || "");
      form.setValue("priceOfPosition4", planPricing?.[3] || "");
    }
  }, [form, planPricing]);

  useEffect(() => {
    if (film) {
      form.setValue("duration", film.duration.toString());
      form.setValue("versionCode", film.versionCode.toString());
    }
  }, [film, form]);

  useEffect(() => {
    if (projectTime && film) {
      const endTime = addMinutesToTime(projectTime, film.duration);
      form.setValue("endTime", endTime);
    }
  }, [projectTime, form, film]);

  useEffect(() => {
    if (isError) {
      form.setValue("priceOfPosition1", "");
      form.setValue("priceOfPosition2", "");
      form.setValue("priceOfPosition3", "");
      form.setValue("priceOfPosition4", "");
    }
  }, [isError, form]);

  return (
    <div className="px-6 py-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} id="add-scheduling-form">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="filmId"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Tên phim</FormLabel>
                  <Select
                    options={(data?.data || [])?.map((item) => ({
                      value: item.filmId,
                      label: item.film.filmName,
                    }))}
                    placeholder="Chọn phim"
                    isLoading={isPending}
                    value={
                      field.value
                        ? {
                            value: field.value,
                            label: data?.data.find(
                              (item) => item.filmId === field.value
                            )?.film.filmName,
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
              name="roomId"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Phòng chiếu</FormLabel>
                  <Select
                    options={(rooms?.data || [])?.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                    placeholder="Chọn phòng chiếu"
                    isLoading={isPendingRooms}
                    value={
                      field.value
                        ? {
                            value: field.value,
                            label: rooms?.data.find(
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
              name="projectDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Ngày chiếu</FormLabel>
                  <FormControl>
                    <CustomDatePicker
                      selectedDate={field.value}
                      onChangeDate={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Giờ chiếu</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Giờ kết thúc</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="time"
                        readOnly
                        placeholder="Giờ kết thúc"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Thời lượng</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly placeholder="Thời lượng phim" />
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
                  <FormControl>
                    <Input {...field} readOnly placeholder="Phiên bản" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priceOfPosition1"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Giá vé 1</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập giá vé 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priceOfPosition2"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Giá vé 2</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập giá vé 2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priceOfPosition3"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Giá vé 3</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập giá vé 3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priceOfPosition4"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Giá vé 4</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập giá vé 4" {...field} />
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

export default AddSchedulingForm;
