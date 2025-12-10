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
import { RoomFormInput, roomFormSchema } from "@/lib/schemas/room-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

interface ScreeningRoomsFormProps {
  onSubmit: (values: RoomFormInput) => void;
  defaultValues?: Partial<RoomFormInput>;
}

const ScreeningRoomsForm = ({
  onSubmit,
  defaultValues,
}: ScreeningRoomsFormProps) => {
  const form = useForm<RoomFormInput>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: defaultValues || {
      name: "",
      numberOfFloor: 1,
      ruleOrder: "",
      wideSizeF1: 0,
      deepSizeF1: 0,
      wideSizeF2: 0,
      deepSizeF2: 0,
      wideSizeF3: 0,
      deepSizeF3: 0,
    },
  });

  const numberOfFloor = form.watch("numberOfFloor");

  useEffect(() => {
    if (numberOfFloor === 1) {
      form.setValue("deepSizeF2", 0);
      form.setValue("wideSizeF2", 0);
      form.setValue("deepSizeF3", 0);
      form.setValue("wideSizeF3", 0);
    } else if (numberOfFloor === 2) {
      form.setValue("deepSizeF3", 0);
      form.setValue("wideSizeF3", 0);
    }
  }, [numberOfFloor, form]);

  return (
    <div className="px-6 py-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} id="screening-rooms-form">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Tên phòng chiếu</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập tên phòng chiếu" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numberOfFloor"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Số tầng</FormLabel>
                  <FormControl>
                    <Select
                      value={String(field.value)}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn số tầng" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="ruleOrder"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Quy luật xếp ghế</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn quy luật" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="Tuần tự từ trái qua phải">
                          Tuần tự từ trái qua phải
                        </SelectItem>
                        <SelectItem value="Tuần tự từ phải qua trái">
                          Tuần tự từ phải qua trái
                        </SelectItem>
                        <SelectItem value="Chẵn bên trái, lẻ bên phải">
                          Chẵn bên trái, lẻ bên phải
                        </SelectItem>
                        <SelectItem value="Lẻ bên trái, chẵn bên phải">
                          Lẻ bên trái, chẵn bên phải
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="bg-beerus rounded-md p-4">
            <div className="flex items-center gap-4">
              <p className="min-w-[70px] text-sm font-bold">Tầng 1</p>
              <FormField
                control={form.control}
                name="wideSizeF1"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Số hàng ghế</FormLabel>
                    <FormControl>
                      <NumberInput
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Nhập số hàng ghế"
                        className="bg-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deepSizeF1"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Số ghế/hàng</FormLabel>
                    <FormControl>
                      <NumberInput
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Nhập số ghế/hàng"
                        className="bg-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {numberOfFloor > 1 && (
              <div className="flex items-center gap-4">
                <p className="min-w-[70px] text-sm font-bold">Tầng 2</p>
                <FormField
                  control={form.control}
                  name="wideSizeF2"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Số hàng ghế</FormLabel>
                      <FormControl>
                        <NumberInput
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Nhập số hàng ghế"
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deepSizeF2"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Số ghế/hàng</FormLabel>
                      <FormControl>
                        <NumberInput
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Nhập số ghế/hàng"
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            {numberOfFloor > 2 && (
              <div className="flex items-center gap-4">
                <p className="min-w-[70px] text-sm font-bold">Tầng 3</p>
                <FormField
                  control={form.control}
                  name="wideSizeF3"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Số hàng ghế</FormLabel>
                      <FormControl>
                        <NumberInput
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Nhập số hàng ghế"
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deepSizeF3"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Số ghế/hàng</FormLabel>
                      <FormControl>
                        <NumberInput
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Nhập số ghế/hàng"
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ScreeningRoomsForm;
