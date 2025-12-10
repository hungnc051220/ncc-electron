"use server";

import { discountFormSchema } from "@/lib/schemas/discount-schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createDiscountService,
  deleteDiscountService,
  updateDiscountService,
} from "./discount-services";

type ActionStateProps = {
  formData: Record<string, string> | null;
  fieldErrors: Record<string, string[]> | null;
  success: boolean;
  error: string | null;
};

export const createDiscountAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const formFields = {
    discountName: formData.get("discountName") as string,
    discountAmount: formData.get("discountAmount") as string,
    discountRate: formData.get("discountRate") as string,
    discountType: formData.get("discountType") as string,
  };

  const formatFormFields = {
    ...formFields,
    discountAmount:
      formFields.discountAmount !== "undefined"
        ? Number(formFields.discountAmount)
        : undefined,
    discountRate:
      formFields.discountRate !== "undefined"
        ? Number(formFields.discountRate)
        : undefined,
  };

  const validatedFields = discountFormSchema.safeParse(formatFormFields);

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

  const res = await createDiscountService(dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields,
      success: false,
      error: data.message || "Thêm giảm giá thất bại",
    };
  }

  revalidatePath("/discount-settings");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const updateDiscountAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;
  const formFields = {
    discountName: formData.get("discountName") as string,
    discountAmount: formData.get("discountAmount") as string,
    discountRate: formData.get("discountRate") as string,
    discountType: formData.get("discountType") as string,
  };

  const formatFormFields = {
    ...formFields,
    discountAmount:
      formFields.discountAmount !== "undefined"
        ? Number(formFields.discountAmount)
        : undefined,
    discountRate:
      formFields.discountRate !== "undefined"
        ? Number(formFields.discountRate)
        : undefined,
  };

  const validatedFields = discountFormSchema.safeParse(formatFormFields);

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

  const res = await updateDiscountService(Number(id), dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields,
      success: false,
      error: data.message || "Cập nhật giảm giá thất bại",
    };
  }

  revalidatePath("/discount-settings");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const deleteDiscountAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;

  const res = await deleteDiscountService(Number(id));

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: "Xóa giảm giá thất bại",
    };
  }

  revalidatePath("/discount-settings");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};
