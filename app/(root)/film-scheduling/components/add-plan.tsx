"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { createPlanCinemaAction } from "@/data/actions";
import { planCinemaFormSchema, type PlanCinemaFormInput } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const AddPlan = () => {
  const [open, setOpen] = useState(false);
  const INITIAL_STATE = {
    formData: null,
    fieldErrors: null,
    success: false,
    error: null,
  };
  const [state, action, pending] = useActionState(
    createPlanCinemaAction,
    INITIAL_STATE
  );

  const form = useForm<PlanCinemaFormInput>({
    resolver: zodResolver(planCinemaFormSchema),
    defaultValues: {
      name: "",
      desciption: "",
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [form, open]);

  const onSubmit = (values: PlanCinemaFormInput) => {
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
      toast.success("Tạo kế hoạch chiếu phim thành công");
      startTransition(() => {
        setOpen(false);
        form.reset();
      });
    }
  }, [state, form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Thêm kế hoạch</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="border-b">
          <DialogTitle>Thêm mới kế hoạch</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} id="plan-form">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Tên kế hoạch</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập tên kế hoạch" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="desciption"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Nhập mô tả kế hoạch"
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

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={pending}>
              Hủy
            </Button>
          </DialogClose>
          <Button type="submit" form="plan-form" disabled={pending}>
            {pending && <Spinner />}
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPlan;
