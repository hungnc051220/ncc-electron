"use server";

import { cancellationReasonFormSchema } from "@/lib/schemas/cancellation-reason-schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createCancellationReasonService,
  deleteCancellationReasonService,
  updateCancellationReasonService,
} from "./cancellation-reason-services";

type ActionStateProps = {
  formData: Record<string, string> | null;
  fieldErrors: Record<string, string[]> | null;
  success: boolean;
  error: string | null;
};

export const createCancellationReasonAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const formFields = {
    reason: formData.get("reason") as string,
  };

  const validatedFields = cancellationReasonFormSchema.safeParse(formFields);

  if (!validatedFields.success) {
    return {
      ...prevState,
      formData: formFields,
      fieldErrors: z.flattenError(validatedFields.error).fieldErrors,
    };
  }

  const dataToSend = {
    ...validatedFields.data,
  };

  const res = await createCancellationReasonService(dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields,
      success: false,
      error: data.message || "Thêm lý do hủy thất bại",
    };
  }

  revalidatePath("/cancellation-reasons");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const updateCancellationReasonAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;
  const formFields = {
    reason: formData.get("reason") as string,
  };

  const validatedFields = cancellationReasonFormSchema.safeParse(formFields);

  if (!validatedFields.success) {
    return {
      ...prevState,
      formData: formFields,
      fieldErrors: z.flattenError(validatedFields.error).fieldErrors,
    };
  }

  const dataToSend = {
    ...validatedFields.data,
  };

  const res = await updateCancellationReasonService(Number(id), dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields,
      success: false,
      error: data.message || "Cập nhật lý do hủy thất bại",
    };
  }

  revalidatePath("/cancellation-reasons");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const deleteCancellationReasonAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;

  const res = await deleteCancellationReasonService(Number(id));

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: "Xóa lý do hủy thất bại",
    };
  }

  revalidatePath("/cancellation-reasons");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};
