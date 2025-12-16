"use server";

import { contractTicketSaleFormSchema } from "@/lib/schemas/contract-ticket-sale-schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createContractTicketSaleService,
  deleteContractTicketSaleService,
  updateContractTicketSaleService,
} from "./contract-ticket-sale-services";

type ActionStateProps = {
  formData: Record<string, string> | null;
  fieldErrors: Record<string, string[]> | null;
  success: boolean;
  error: string | null;
};

export const createContractTicketSaleAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const formFields = {
    customerFirstName: formData.get("customerFirstName") as string,
    customerPhone: formData.get("customerPhone") as string,
    orderTotal: formData.get("orderTotal") as string,
  };

  const formatttedFormFields = {
    ...formFields,
    orderTotal: Number(formFields.orderTotal),
  };

  const validatedFields =
    contractTicketSaleFormSchema.safeParse(formatttedFormFields);

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

  const res = await createContractTicketSaleService(dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields as Record<string, string>,
      success: false,
      error: data.message || "Thêm hợp đồng thất bại",
    };
  }

  revalidatePath("/contract-ticket-sales");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const updateContractTicketSaleAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;
  const formFields = {
    customerFirstName: formData.get("customerFirstName") as string,
    customerPhone: formData.get("customerPhone") as string,
    orderTotal: formData.get("orderTotal") as string,
  };

  const formatttedFormFields = {
    ...formFields,
    orderTotal: Number(formFields.orderTotal),
  };

  const validatedFields =
    contractTicketSaleFormSchema.safeParse(formatttedFormFields);

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

  const res = await updateContractTicketSaleService(Number(id), dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields as Record<string, string>,
      success: false,
      error: data.message || "Cập nhật hợp đồng thất bại",
    };
  }

  revalidatePath("/contract-ticket-sales");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const deleteContractTicketSaleAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;

  const res = await deleteContractTicketSaleService(Number(id));

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: "Xóa hợp đồng thất bại",
    };
  }

  revalidatePath("/contract-ticket-sales");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};
