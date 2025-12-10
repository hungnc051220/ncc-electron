"use server";

import { roomFormSchema } from "@/lib/schemas/room-schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createRoomService,
  deleteRoomService,
  updateRoomService,
} from "./room-services";

type ActionStateProps = {
  formData: Record<string, string> | null;
  fieldErrors: Record<string, string[]> | null;
  success: boolean;
  error: string | null;
};

export const createRoomAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const formFields = {
    name: formData.get("name") as string,
    numberOfFloor: formData.get("numberOfFloor") as string,
    ruleOrder: formData.get("ruleOrder") as string,
    deepSizeF1: formData.get("deepSizeF1") as string,
    wideSizeF1: formData.get("deepSizeF1") as string,
    deepSizeF2: formData.get("deepSizeF2") as string,
    wideSizeF2: formData.get("deepSizeF2") as string,
    deepSizeF3: formData.get("deepSizeF3") as string,
    wideSizeF3: formData.get("deepSizeF3") as string,
  };

  const formatFormFields = {
    ...formFields,
    numberOfFloor: Number(formFields.numberOfFloor),
    deepSizeF1: Number(formFields.deepSizeF1),
    wideSizeF1: Number(formFields.wideSizeF1),
    deepSizeF2: Number(formFields.deepSizeF2),
    wideSizeF2: Number(formFields.wideSizeF2),
    deepSizeF3: Number(formFields.deepSizeF3),
    wideSizeF3: Number(formFields.wideSizeF3),
  };

  const validatedFields = roomFormSchema.safeParse(formatFormFields);

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

  const res = await createRoomService(dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields,
      success: false,
      error: data.message || "Thêm phòng chiếu thất bại",
    };
  }

  revalidatePath("/screening-rooms");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const updateRoomAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;
  const formFields = {
    name: formData.get("name") as string,
    numberOfFloor: formData.get("numberOfFloor") as string,
    ruleOrder: formData.get("ruleOrder") as string,
    deepSizeF1: formData.get("deepSizeF1") as string,
    wideSizeF1: formData.get("deepSizeF1") as string,
    deepSizeF2: formData.get("deepSizeF2") as string,
    wideSizeF2: formData.get("deepSizeF2") as string,
    deepSizeF3: formData.get("deepSizeF3") as string,
    wideSizeF3: formData.get("deepSizeF3") as string,
  };

  const formatFormFields = {
    ...formFields,
    numberOfFloor: Number(formFields.numberOfFloor),
    deepSizeF1: Number(formFields.deepSizeF1),
    wideSizeF1: Number(formFields.wideSizeF1),
    deepSizeF2: Number(formFields.deepSizeF2),
    wideSizeF2: Number(formFields.wideSizeF2),
    deepSizeF3: Number(formFields.deepSizeF3),
    wideSizeF3: Number(formFields.wideSizeF3),
  };

  const validatedFields = roomFormSchema.safeParse(formatFormFields);

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

  const res = await updateRoomService(Number(id), dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields,
      success: false,
      error: data.message || "Cập nhật phòng chiếu thất bại",
    };
  }

  revalidatePath("/screening-rooms");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const deleteRoomAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;

  const res = await deleteRoomService(Number(id));

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: "Xóa phòng chiếu thất bại",
    };
  }

  revalidatePath("/screening-rooms");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};
