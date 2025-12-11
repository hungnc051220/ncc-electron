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
  CancellationReasonFormInput,
  cancellationReasonFormSchema,
} from "@/lib/schemas/cancellation-reason-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

interface CancellationReasonFormProps {
  onSubmit: (values: CancellationReasonFormInput) => void;
  defaultValues?: Partial<CancellationReasonFormInput>;
}

const CancellationReasonForm = ({
  onSubmit,
  defaultValues,
}: CancellationReasonFormProps) => {
  const form = useForm<CancellationReasonFormInput>({
    resolver: zodResolver(cancellationReasonFormSchema),
    defaultValues: defaultValues || {
      reason: "",
    },
  });

  return (
    <div className="px-6 py-5">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          id="cancellation-reason-form"
        >
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Lý do hủy</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nhập lý do hủy"
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

export default CancellationReasonForm;
