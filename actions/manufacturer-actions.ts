"use server";

import { manufacturerFormSchema } from "@/lib/schemas/manufacturer-schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createManufacturerService,
  deleteManufacturerService,
  updateManufacturerService,
} from "./manufacturer-services";

type ActionStateProps = {
  formData: Record<string, string> | null;
  fieldErrors: Record<string, string[]> | null;
  success: boolean;
  error: string | null;
};

export const createManufacturerAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const formFields = {
    name: formData.get("name") as string,
    fullName: formData.get("fullName") as string,
    manufacturerTemplateId: formData.get("manufacturerTemplateId") as string,
    bankName: formData.get("bankName") as string,
    phoneNumber: formData.get("phoneNumber") as string,
    acountBank: formData.get("acountBank") as string,
    addressBank: formData.get("addressBank") as string,
    address: formData.get("address") as string,
    fax: formData.get("fax") as string,
    url: formData.get("url") as string,
  };

  const formatFormFields = {
    ...formFields,
    manufacturerTemplateId: Number(formFields.manufacturerTemplateId),
  };

  const validatedFields = manufacturerFormSchema.safeParse(formatFormFields);

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

  const res = await createManufacturerService(dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields,
      success: false,
      error: data.message || "Thêm hãng phim thất bại",
    };
  }

  revalidatePath("/manufacturers");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const updateManufacturerAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;
  const formFields = {
    name: formData.get("name") as string,
    fullName: formData.get("fullName") as string,
    bankName: formData.get("bankName") as string,
    manufacturerTemplateId: formData.get("manufacturerTemplateId") as string,
    phoneNumber: formData.get("phoneNumber") as string,
    acountBank: formData.get("acountBank") as string,
    addressBank: formData.get("addressBank") as string,
    address: formData.get("address") as string,
    fax: formData.get("fax") as string,
    url: formData.get("url") as string,
  };

  const formatFormFields = {
    ...formFields,
    manufacturerTemplateId: Number(formFields.manufacturerTemplateId),
  };

  const validatedFields = manufacturerFormSchema.safeParse(formatFormFields);

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

  const res = await updateManufacturerService(Number(id), dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields,
      success: false,
      error: data.message || "Cập nhật hãng phim thất bại",
    };
  }

  revalidatePath("/manufacturers");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const deleteManufacturerAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;

  const res = await deleteManufacturerService(Number(id));

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: "Xóa hãng phim thất bại",
    };
  }

  revalidatePath("/manufacturers");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};
