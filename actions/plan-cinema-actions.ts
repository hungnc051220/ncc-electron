"use server";

import {
  planCinemaFormSchema
} from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addPlanFilmService,
  approveRejectPlanCinemaService,
  createPlanCinemaService,
  deletePlanCinemaService,
  updatePlanCinemaService
} from "./plan-cinema-services";

type ActionStateProps = {
  formData: Record<string, string> | null;
  fieldErrors: Record<string, string[]> | null;
  success: boolean;
  error: string | null;
};

export const deletePlanCinemaAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const planCinemaId = formData.get("planCinemaId") as string;

  const res = await deletePlanCinemaService(Number(planCinemaId));

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: "Xóa kế hoạch chiếu phim thất bại",
    };
  }

  revalidatePath("/film-scheduling");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const createPlanCinemaAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const name = formData.get("name") as string;
  const desciption = formData.get("desciption") as string;

  const validatedFields = planCinemaFormSchema.safeParse({ name, desciption });

  if (!validatedFields.success) {
    return {
      ...prevState,
      formData: { name, desciption },
      fieldErrors: z.flattenError(validatedFields.error).fieldErrors,
    };
  }

  const response = await createPlanCinemaService(validatedFields.data);
  
  let data;
  try {
    data = await response.json();
  } catch {
    data = { message: 'Invalid server response' };
  }

  if (!response.ok) {
    return {
      ...prevState,
      formData: { name, desciption },
      success: false,
      error: data?.message || "Tạo kế hoạch chiếu phim thất bại",
    };
  }

  revalidatePath("/film-scheduling");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const approveRejectPlanCinemaAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("planCinemaId") as string;
  const isApproved = formData.get("isApproved") as string;

  const res = await approveRejectPlanCinemaService({
    id: Number(id),
    isApproved: isApproved === "true" ? true : false,
  });

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: "Duyệt kế hoạch thất bại",
    };
  }

  revalidatePath("/film-scheduling");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const updatePlanCinemaAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const id = formData.get("planCinemaId") as string;
  const status = formData.get("status") as string;

  const res = await updatePlanCinemaService({
    id: Number(id),
    status: Number(status),
  });

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: "Cập nhật kế hoạch thất bại",
    };
  }

  revalidatePath("/film-scheduling");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const addPlanFilmAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const planCinemaId = formData.get("planCinemaId") as string;
  const filmIds = formData.get("filmIds") as string;

  if (!planCinemaId || !filmIds) {
    return {
      ...prevState,
      success: false,
      error: "Vui lòng chọn ít nhất một phim",
    };
  }

  let parsedFilmIds: number[];
  try {
    parsedFilmIds = JSON.parse(filmIds);
  } catch {
    return {
      ...prevState,
      success: false,
      error: "Dữ liệu phim không hợp lệ",
    };
  }

  if (!Array.isArray(parsedFilmIds) || parsedFilmIds.length === 0) {
    return {
      ...prevState,
      success: false,
      error: "Vui lòng chọn ít nhất một phim",
    };
  }

  const res = await addPlanFilmService({
    filmIds: parsedFilmIds,
    planCinemaId: Number(planCinemaId),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = { message: 'Invalid server response' };
  }

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: data?.message || "Thêm phim vào kế hoạch thất bại",
    };
  }

  revalidatePath("/film-scheduling");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};