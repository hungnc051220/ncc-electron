"use server";

import { addSchedulingFormSchema } from "@/lib/schemas/add-scheduling-schema";
import { format } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createPlanScreeningService, deletePlanScreeningService } from "./plan-screening-services";

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
    priceOfPosition1: Number(formFields.priceOfPosition1),
    priceOfPosition2: Number(formFields.priceOfPosition2),
    priceOfPosition3: Number(formFields.priceOfPosition3),
    priceOfPosition4: Number(formFields.priceOfPosition4),
    projectDate: new Date(formFields.projectDate),
  };

  const validatedFields =
    addSchedulingFormSchema.safeParse(formatttedFormFields);

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
    priceOfPosition1: `D:${validatedFields.data.priceOfPosition1}`,
    priceOfPosition2: `T:${validatedFields.data.priceOfPosition2}`,
    priceOfPosition3: `V:${validatedFields.data.priceOfPosition3}`,
    priceOfPosition4: `PT:${validatedFields.data.priceOfPosition4}`,
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
