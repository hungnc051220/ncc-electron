"use server";

import { holidayFormSchema } from "@/lib/schemas/holiday-schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createHolidayService, deleteHolidayService } from "./holiday-services";

type ActionStateProps = {
  formData: Record<string, string> | null;
  fieldErrors: Record<string, string[]> | null;
  success: boolean;
  error: string | null;
};

export const createHolidayAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const formFields = {
    year: formData.get("year") as string,
    dateTypeId: formData.get("dateTypeId") as string,
    daysInWeek: formData.get("daysInWeek") as string,
    specialDates: formData.get("specialDates") as string,
    specificDate: formData.get("specificDate") as string,
  };

  const daysInWeek = JSON.parse(formFields.daysInWeek);
  const specialDates = JSON.parse(formFields.specialDates);

  const formatttedFormFields = {
    ...formFields,
    daysInWeek,
    specialDates,
  };

  const validatedFields = holidayFormSchema.safeParse(formatttedFormFields);

  if (!validatedFields.success) {
    return {
      ...prevState,
      formData: formFields,
      fieldErrors: z.flattenError(validatedFields.error).fieldErrors,
    };
  }

  const dataToSend = {
    ...validatedFields.data,
    year: Number(formFields.year),
    dateTypeId: Number(formFields.dateTypeId),
  };

  const res = await createHolidayService(dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields as Record<string, string>,
      success: false,
      error: data.message || "Cập nhật ngày thất bại",
    };
  }

  revalidatePath("/holidays");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const deleteHolidayAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;

  const res = await deleteHolidayService(id);

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: "Xóa ngày thất bại",
    };
  }

  revalidatePath("/holidays");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};
