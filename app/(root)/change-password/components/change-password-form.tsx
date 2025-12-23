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
  ChangePasswordFormInput,
  changePasswordFormSchema,
} from "@/lib/schemas/user-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { startTransition, useActionState, useCallback, useEffect } from "react";
import { changePasswordAction } from "@/actions/user-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

type ChangePasswordFormProps = {
  onPendingChange?: (pending: boolean) => void;
};

const ChangePasswordForm = ({ onPendingChange }: ChangePasswordFormProps) => {
  const form = useForm<ChangePasswordFormInput>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      password: "",
      new_password: "",
    },
  });

  const router = useRouter();

  const handleOpenChange = useCallback(() => router.back(), [router]);

  const [state, action, pending] = useActionState(
    changePasswordAction,
    INITIAL_STATE
  );

  const onSubmit = (values: ChangePasswordFormInput) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      formData.append(key, value as string);
    });
    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }

    if (state.success) {
      toast.success("Thay đổi mật khẩu thành công");
      handleOpenChange();
    }
  }, [state, handleOpenChange]);

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  return (
    <div className="px-6 py-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} id="change-password-form">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Mật khẩu cũ</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Nhập mật khẩu cũ"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="new_password"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Mật khẩu mới</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Nhập mật khẩu mới"
                    {...field}
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

export default ChangePasswordForm;
