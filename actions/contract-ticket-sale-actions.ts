"use server";

import { contractTicketSaleFormSchema } from "@/lib/schemas/contract-ticket-sale-schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createContractTicketSaleService,
  deleteContractTicketSaleService,
  updateContractTicketSaleService,
  updateSeatContractTicketSaleService,
} from "./contract-ticket-sale-services";
import { UpdateSeatContractTicketSaleBodyProps } from "@/types";

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

export const updateSeatContractTicketSaleAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;
  const floorNo = Number(formData.get("floorNo") as string);

  const dataToSend: UpdateSeatContractTicketSaleBodyProps = {
    planScreenId: Number(formData.get("planScreenId") as string),
    floorNo,
  };

  if (floorNo === 1) {
    dataToSend.listChairIndexF1 = formData.get("listChairIndexF1") as string;
    dataToSend.listChairValueF1 = formData.get("listChairValueF1") as string;
  } else if (floorNo === 2) {
    dataToSend.listChairIndexF2 = formData.get("listChairIndexF2") as string;
    dataToSend.listChairValueF2 = formData.get("listChairValueF2") as string;
  } else if (floorNo === 3) {
    dataToSend.listChairIndexF3 = formData.get("listChairIndexF3") as string;
    dataToSend.listChairValueF3 = formData.get("listChairValueF3") as string;
  }

  const res = await updateSeatContractTicketSaleService(Number(id), dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: data.message || "Cập nhật sơ đồ ghế cho hợp đồng thất bại",
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
