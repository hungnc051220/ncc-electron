"use server";

import { showtimeSlotFormSchema } from "@/lib/schemas/showtime-slot-schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createShowtimeSlotService,
  deleteShowtimeSlotService,
  updateShowtimeSlotService,
} from "./showtime-slot-services";

type ActionStateProps = {
  formData: Record<string, string> | null;
  fieldErrors: Record<string, string[]> | null;
  success: boolean;
  error: string | null;
};

export const createShowtimeSlotAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const formFields = {
    dateTypeId: formData.get("dateTypeId") as string,
    name: formData.get("name") as string,
    fromTime: formData.get("fromTime") as string,
    toTime: formData.get("toTime") as string,
  };

  const formatttedFormFields = {
    ...formFields,
    dateTypeId: Number(formFields.dateTypeId),
  };

  const validatedFields = showtimeSlotFormSchema.safeParse(formatttedFormFields);

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

  const res = await createShowtimeSlotService(dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields as Record<string, string>,
      success: false,
      error: data.message || "Thêm ca chiếu thất bại",
    };
  }

  revalidatePath("/showtime-slots");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const updateShowtimeSlotAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;
  const formFields = {
    dateTypeId: formData.get("dateTypeId") as string,
    name: formData.get("name") as string,
    fromTime: formData.get("fromTime") as string,
    toTime: formData.get("toTime") as string,
  };

  const formatttedFormFields = {
    ...formFields,
    dateTypeId: Number(formFields.dateTypeId),
  };

  const validatedFields = showtimeSlotFormSchema.safeParse(formatttedFormFields);

  if (!validatedFields.success) {
    return {
      ...prevState,
      formData: formFields as Record<string, string>,
      fieldErrors: z.flattenError(validatedFields.error).fieldErrors,
    };
  }

  const dataToSend = {
    ...validatedFields.data,
  };

  const res = await updateShowtimeSlotService(Number(id), dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields as Record<string, string>,
      success: false,
      error: data.message || "Cập nhật ca chiếu thất bại",
    };
  }

  revalidatePath("/showtime-slots");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const deleteShowtimeSlotAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;

  const res = await deleteShowtimeSlotService(Number(id));

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: "Xóa ca chiếu thất bại",
    };
  }

  revalidatePath("/showtime-slots");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

