"use server";

import { ticketPriceFormSchema } from "@/lib/schemas/ticket-price-schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createTicketPriceService,
  deleteTicketPriceService,
  updateTicketPriceService,
} from "./ticket-price-services";

type ActionStateProps = {
  formData: Record<string, string> | null;
  fieldErrors: Record<string, string[]> | null;
  success: boolean;
  error: string | null;
};

export const createTicketPriceAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const formFields = {
    versionCode: formData.get("versionCode") as string,
    daypartId: formData.get("daypartId") as string,
    positionId: formData.get("positionId") as string,
    price: formData.get("price") as string,
  };

  const formatttedFormFields = {
    ...formFields,
    daypartId: Number(formFields.daypartId),
    positionId: Number(formFields.positionId),
    price: Number(formFields.price),
  };

  const validatedFields = ticketPriceFormSchema.safeParse(formatttedFormFields);

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

  const res = await createTicketPriceService(dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields as Record<string, string>,
      success: false,
      error: data.message || "Thêm giá vé thất bại",
    };
  }

  revalidatePath("/ticket-prices");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const updateTicketPriceAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;
  const formFields = {
    versionCode: formData.get("versionCode") as string,
    daypartId: formData.get("daypartId") as string,
    positionId: formData.get("positionId") as string,
    price: formData.get("price") as string,
  };

  const formatttedFormFields = {
    ...formFields,
    daypartId: Number(formFields.daypartId),
    positionId: Number(formFields.positionId),
    price: Number(formFields.price),
  };

  const validatedFields = ticketPriceFormSchema.safeParse(formatttedFormFields);

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

  const res = await updateTicketPriceService(Number(id), dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields as Record<string, string>,
      success: false,
      error: data.message || "Cập nhật giá vé thất bại",
    };
  }

  revalidatePath("/ticket-prices");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const deleteTicketPriceAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;

  const res = await deleteTicketPriceService(Number(id));

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: "Xóa giá vé thất bại",
    };
  }

  revalidatePath("/ticket-prices");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

