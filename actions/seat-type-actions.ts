"use server";

import { seatTypeFormSchema } from "@/lib/schemas/seat-type-schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSeatTypeService, deleteSeatTypeService, updateSeatTypeService } from "./seat-type-services";

type ActionStateProps = {
  formData: Record<string, string> | null;
  fieldErrors: Record<string, string[]> | null;
  success: boolean;
  error: string | null;
};

export const createSeatTypeAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const formFields = {
    positionCode: formData.get("positionCode") as string,
    name: formData.get("name") as string,
    color: formData.get("color") as string,
    isSeat: formData.get("isSeat") as string,
    isDefault: formData.get("isDefault") as string,
    pictureUrl: formData.get("pictureUrl") as string,
  };

  const formattedFormFields = {
    ...formFields,
    isSeat: formFields.isSeat === "true" ? true : false,
    isDefault: formFields.isDefault === "true" ? true : false,
  };

  const validatedFields = seatTypeFormSchema.safeParse(formattedFormFields);

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

  const res = await createSeatTypeService(dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields,
      success: false,
      error: data.message || "Thêm vị trí thất bại",
    };
  }

  revalidatePath("/seat-types");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const updateSeatTypeAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;
  const formFields = {
    positionCode: formData.get("positionCode") as string,
    name: formData.get("name") as string,
    color: formData.get("color") as string,
    isSeat: formData.get("isSeat") as string,
    isDefault: formData.get("isDefault") as string,
    pictureUrl: formData.get("pictureUrl") as string,
  };

  const formattedFormFields = {
    ...formFields,
    isSeat: formFields.isSeat === "true" ? true : false,
    isDefault: formFields.isDefault === "true" ? true : false,
  };

  const validatedFields = seatTypeFormSchema.safeParse(formattedFormFields);

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

  const res = await updateSeatTypeService(Number(id), dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields,
      success: false,
      error: data.message || "Cập nhật vị trí thất bại",
    };
  }

  revalidatePath("/seat-types");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const deleteSeatTypeAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;

  const res = await deleteSeatTypeService(Number(id));

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: "Xóa vị trí thất bại",
    };
  }

  revalidatePath("/seat-types");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};
