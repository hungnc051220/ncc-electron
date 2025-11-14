"use client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { signInAction } from "@/actions/sign-in-actions";
import { SignInInput, signInSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { User2 } from "lucide-react";
import { startTransition, useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

const SignInForm = () => {
  const [state, action, pending] = useActionState(
    signInAction,
    INITIAL_STATE
  );

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (state.fieldErrors) {
      Object.entries(state.fieldErrors).forEach(([key, messages]) => {
        if (messages && messages.length > 0) {
          form.setError(key as keyof SignInInput, {
            type: "server",
            message: messages[0],
          });
        }
      });
    }

    if (state.error) {
      toast.error(state.error);
    }
  }, [state, form]);

  const onSubmit = (values: SignInInput) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) =>
      formData.append(key, value)
    );
    startTransition(() => action(formData));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 w-full">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder="Tên đăng nhập"
                  className="input-form"
                  {...field}
                  icon={User2}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder="Mật khẩu"
                  type="password"
                  className="input-form"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button
          disabled={pending}
          type="submit"
          className="w-full h-14 font-bold text-base"
        >
          {pending && <Spinner />}
          Đăng nhập
        </Button>
      </form>
    </Form>
  );
};

export default SignInForm;
