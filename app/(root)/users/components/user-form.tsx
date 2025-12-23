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
import useGeneralData from "@/hooks/use-general-data";
import {
  updateUserFormSchema,
  UserFormInput,
  userFormSchema,
} from "@/lib/schemas/user-schema";
import { CustomerRoleProps } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDownIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import Select from "react-select";

interface UserFormProps {
  onSubmit: (values: UserFormInput) => void;
  customerRoles: CustomerRoleProps[];
  defaultValues?: Partial<UserFormInput>;
  isEdit?: boolean;
}

const UserForm = ({
  onSubmit,
  customerRoles,
  defaultValues,
  isEdit = false,
}: UserFormProps) => {
  const data = useGeneralData((state) => state.data);
  const form = useForm<UserFormInput>({
    resolver: zodResolver(isEdit ? updateUserFormSchema : userFormSchema),
    defaultValues: defaultValues || {
      roleIds: [],
      customerFirstName: "",
      customerLastName: "",
      manufacturerId: data?.manufacturers?.[0]?.id || 1,
      address: "",
      email: "",
      mobile: "",
      username: "",
      password: "",
    },
  });

  return (
    <div className="px-6 py-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} id="user-form">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <FormField
              control={form.control}
              name="roleIds"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Nhóm người dùng</FormLabel>
                  <Select
                    options={customerRoles?.map((role) => ({
                      value: role.id,
                      label: role.name,
                    }))}
                    placeholder="Chọn nhóm người dùng"
                    isMulti
                    defaultValue={field.value?.map((value) => ({
                      value: value,
                      label: customerRoles?.find((role) => role.id === value)
                        ?.name,
                    }))}
                    onChange={(values) =>
                      field.onChange(values?.map((value) => value.value))
                    }
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerFirstName"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Họ</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập họ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerLastName"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Tên</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập tên" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
              name="email"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mobile"
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
              name="username"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Tên đăng nhập</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập tên đăng nhập" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>
                    Mật khẩu{isEdit && " (để trống nếu không đổi)"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={
                        isEdit ? "Để trống nếu không đổi" : "Nhập mật khẩu"
                      }
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

export default UserForm;
