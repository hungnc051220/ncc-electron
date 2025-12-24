"use server";

import { addSchedulingFormSchema } from "@/lib/schemas/add-scheduling-schema";
import { format } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createPlanScreeningService,
  deletePlanScreeningService,
} from "./plan-screening-services";

type ActionStateProps = {
  formData: Record<string, string> | null;
  fieldErrors: Record<string, string[]> | null;
  success: boolean;
  error: string | null;
};

export const createPlanScreeningAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const formFields = {
    planCinemaId: formData.get("planCinemaId") as string,
    projectDate: formData.get("projectDate") as string,
    projectTime: formData.get("projectTime") as string,
    filmId: formData.get("filmId") as string,
    roomId: formData.get("roomId") as string,
    priceOfPosition1: formData.get("priceOfPosition1") as string,
    priceOfPosition2: formData.get("priceOfPosition2") as string,
    priceOfPosition3: formData.get("priceOfPosition3") as string,
    priceOfPosition4: formData.get("priceOfPosition4") as string,
  };

  const formatttedFormFields = {
    ...formFields,
    planCinemaId: Number(formFields.planCinemaId),
    filmId: Number(formFields.filmId),
    roomId: Number(formFields.roomId),
    projectDate: new Date(formFields.projectDate),
  };

  const cleaned = Object.fromEntries(
    Object.entries(formatttedFormFields).filter(([_, v]) => v != null)
  );

  const validatedFields = addSchedulingFormSchema.safeParse(cleaned);

  if (!validatedFields.success) {
    return {
      ...prevState,
      formData: formFields,
      fieldErrors: z.flattenError(validatedFields.error).fieldErrors,
    };
  }

  const dataToSend = {
    ...validatedFields.data,
    planCinemaId: formatttedFormFields.planCinemaId,
    projectDate: format(validatedFields.data.projectDate, "yyyy-MM-dd"),
  };

  const res = await createPlanScreeningService(dataToSend);

  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields as Record<string, string>,
      success: false,
      error: data.message || "Thêm ca chiếu vào kế hoạch thất bại",
    };
  }

  revalidatePath("/film-scheduling");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const deletePlanScreeningAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("id") as string;

  const res = await deletePlanScreeningService(Number(id));

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: "Xóa ca chiếu trong kế hoạch thất bại",
    };
  }

  revalidatePath("/film-scheduling");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const deleteMultiPlanScreeningAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const planIds = formData.get("planIds") as string;
  const parsedPlanIds: number[] = JSON.parse(planIds) || [];

  if (!parsedPlanIds.length) {
    return {
      ...prevState,
      success: false,
      error: "Không có kế hoạch nào để xóa",
    };
  }

  const results = await Promise.allSettled(parsedPlanIds.map(id => deletePlanScreeningService(id)));
  const failedIds: number[] = [];

  results.forEach((result, index) => {
    if (
      result.status === "rejected" ||
      (result.status === "fulfilled" && !result.value.ok)
    ) {
      failedIds.push(parsedPlanIds[index]);
    }
  });

  revalidatePath("/film-scheduling");

  if (failedIds.length > 0) {
    return {
      ...prevState,
      success: false,
      error: `Xóa thất bại ${failedIds.length}/${parsedPlanIds.length} kế hoạch`,
    };
  }

  revalidatePath("/film-scheduling");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};
