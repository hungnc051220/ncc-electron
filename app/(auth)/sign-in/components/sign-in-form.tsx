"use client";

import { signInAction } from "@/actions/sign-in-actions";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { SignInInput, signInSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, KeyboardIcon, User2 } from "lucide-react";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import Keyboard, { KeyboardReactInterface } from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

const FIELD_ORDER: Array<keyof SignInInput> = ["username", "password"];

const SignInForm = () => {
  const keyboardRef = useRef<KeyboardReactInterface | null>(null);
  const [open, setOpen] = useState(false);
  const [layoutName, setLayoutName] = useState("default");
  const [activeField, setActiveField] = useState<keyof SignInInput | null>(
    null
  );
  const ignoreNextChange = useRef(false);

  const [state, action, pending] = useActionState(signInAction, INITIAL_STATE);

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

  const focusField = (field: keyof SignInInput) => {
    setActiveField(field);
    form.setFocus(field);
    const currentValue = form.getValues(field) ?? "";
    keyboardRef.current?.setInput?.(currentValue);
  };

  const onKeyPress = (button: string) => {
    if (button === "{shift}" || button === "{lock}") {
      setLayoutName(layoutName === "default" ? "shift" : "default");
      return;
    }

    if (button === "{tab}") {
      ignoreNextChange.current = true;
      const currentIndex = activeField
        ? FIELD_ORDER.indexOf(activeField)
        : 0;
      const nextField = FIELD_ORDER[(currentIndex + 1) % FIELD_ORDER.length];
      focusField(nextField);
      return;
    }

    if (button === "{enter}") {
      ignoreNextChange.current = true;
      form.handleSubmit(onSubmit)();
    }
  };

  const onChange = (input: string) => {
    if (ignoreNextChange.current) {
      ignoreNextChange.current = false;
      return;
    }
    if (!activeField) return;

    form.setValue(activeField, input, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const watchedUsername = useWatch({
    control: form.control,
    name: "username",
  });
  const watchedPassword = useWatch({
    control: form.control,
    name: "password",
  });

  useEffect(() => {
    if (!activeField) return;
    const value =
      activeField === "username" ? watchedUsername ?? "" : watchedPassword ?? "";
    keyboardRef.current?.setInput?.(value);
  }, [activeField, watchedUsername, watchedPassword]);

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5 w-full"
        >
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
                    onFocus={() => focusField("username")}
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
                    onFocus={() => focusField("password")}
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

          <fieldset className="border-t border-gray-300">
            <legend className="mx-auto px-3 text-sm text-gray-500">
              hoặc sử dụng
            </legend>
          </fieldset>
        </form>
      </Form>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            disabled={pending}
            type="button"
            className="w-full h-14 font-bold text-base bg-jiren text-primary hover:bg-jiren hover:shadow-md transition-all"
          >
            <KeyboardIcon /> Bàn phím ảo
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="max-w-5xl w-full mx-auto space-y-4 px-4 pb-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex gap-4 w-full"
              >
                <DrawerClose asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    className="size-[50px] bg-jiren hover:bg-jiren/70"
                  >
                    <ChevronDown className="size-5 text-primary" />
                  </Button>
                </DrawerClose>
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder="Tên đăng nhập"
                          className="input-form"
                          {...field}
                          icon={User2}
                          onFocus={() => focusField("username")}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder="Mật khẩu"
                          type="password"
                          className="input-form"
                          {...field}
                          onFocus={() => focusField("password")}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  disabled={pending}
                  type="submit"
                  className="h-[50px] w-[300px] font-bold text-base"
                >
                  {pending && <Spinner />}
                  Đăng nhập
                </Button>
              </form>
            </Form>
            <Keyboard
              keyboardRef={(r) => (keyboardRef.current = r)}
              layoutName={layoutName}
              onKeyPress={onKeyPress}
              onChange={onChange}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default SignInForm;
