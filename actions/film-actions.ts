"use server";

import { filmFormSchema } from "@/lib/schemas/film-schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createFilmService,
  deleteFilmService,
  updateFilmService,
} from "./film-services";

type ActionStateProps = {
  formData: Record<string, unknown> | null;
  fieldErrors: Record<string, string[]> | null;
  success: boolean;
  error: string | null;
};

export const createFilmAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const formFields = {
    filmName: formData.get("filmName") as string,
    filmNameEn: formData.get("filmNameEn") as string,
    versionCode: formData.get("versionCode") as string,
    countryId: formData.get("countryId") as string,
    manufacturerId: formData.get("manufacturerId") as string,
    premieredDay: formData.get("premieredDay") as string,
    duration: formData.get("duration") as string,
    statusCode: formData.get("statusCode") as string,
    languageCode: formData.get("languageCode") as string,
    director: formData.get("director") as string,
    actors: formData.get("actors") as string,
    proposedPrice: formData.get("proposedPrice") as string,
    videoUrl: formData.get("videoUrl") as string,
    ageAbove: formData.get("ageAbove") as string,
    introduction: formData.get("introduction") as string,
    description: formData.get("description") as string,
    imageUrl: formData.get("imageUrl") as string,
    categoryIds: formData.get("categoryIds") as string,
    isHot: formData.get("isHot") === "true",
    sellOnline: formData.get("sellOnline") === "true",
    showOnHomePage: formData.get("showOnHomePage") === "true",
    trailerOnHomePage: formData.get("trailerOnHomePage") === "true",
    published: formData.get("published") === "true",
    allowCustomerReviews: formData.get("allowCustomerReviews") === "true",
    orderNo: formData.get("orderNo") as string,
  };

  const formatFormFields = {
    ...formFields,
    countryId: formFields.countryId ? Number(formFields.countryId) : undefined,
    manufacturerId: formFields.manufacturerId
      ? Number(formFields.manufacturerId)
      : undefined,
    duration: formFields.duration ? Number(formFields.duration) : 0,
    proposedPrice: formFields.proposedPrice
      ? Number(formFields.proposedPrice)
      : undefined,
    ageAbove: formFields.ageAbove ? Number(formFields.ageAbove) : undefined,
    categoryIds: formFields.categoryIds
      ? JSON.parse(formFields.categoryIds)
      : [],
    premieredDay: formFields.premieredDay || undefined,
    orderNo: formFields.orderNo ? Number(formFields.orderNo) : 0,
  };

  const validatedFields = filmFormSchema.safeParse(formatFormFields);

  if (!validatedFields.success) {
    return {
      ...prevState,
      formData: formFields,
      fieldErrors: z.flattenError(validatedFields.error).fieldErrors,
    };
  }

  const res = await createFilmService(validatedFields.data);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields,
      success: false,
      error: data.message || "Thêm phim thất bại",
    };
  }

  revalidatePath("/films");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const updateFilmAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const formFields = {
    id: formData.get("id") as string,
    filmName: formData.get("filmName") as string,
    filmNameEn: formData.get("filmNameEn") as string,
    versionCode: formData.get("versionCode") as string,
    countryId: formData.get("countryId") as string,
    manufacturerId: formData.get("manufacturerId") as string,
    premieredDay: formData.get("premieredDay") as string,
    duration: formData.get("duration") as string,
    statusCode: formData.get("statusCode") as string,
    languageCode: formData.get("languageCode") as string,
    director: formData.get("director") as string,
    actors: formData.get("actors") as string,
    proposedPrice: formData.get("proposedPrice") as string,
    videoUrl: formData.get("videoUrl") as string,
    ageAbove: formData.get("ageAbove") as string,
    introduction: formData.get("introduction") as string,
    description: formData.get("description") as string,
    imageUrl: formData.get("imageUrl") as string,
    categoryIds: formData.get("categoryIds") as string,
    isHot: formData.get("isHot") as string,
    sellOnline: formData.get("sellOnline") === "true",
    showOnHomePage: formData.get("showOnHomePage") === "true",
    trailerOnHomePage: formData.get("trailerOnHomePage") === "true",
    published: formData.get("published") === "true",
    allowCustomerReviews: formData.get("allowCustomerReviews") === "true",
    orderNo: formData.get("orderNo") as string,
    sellOnlineBefore: formData.get("sellOnlineBefore") as string,
    isFree: formData.get("isFree") === "true",
  };

  const formatFormFields = {
    ...formFields,
    id: formFields.id ? Number(formFields.id) : undefined,
    countryId: formFields.countryId ? Number(formFields.countryId) : undefined,
    manufacturerId: formFields.manufacturerId
      ? Number(formFields.manufacturerId)
      : undefined,
    duration: formFields.duration ? Number(formFields.duration) : 0,
    proposedPrice: formFields.proposedPrice
      ? Number(formFields.proposedPrice)
      : undefined,
    ageAbove: formFields.ageAbove ? Number(formFields.ageAbove) : undefined,
    sellOnlineBefore: formFields.sellOnlineBefore ? Number(formFields.sellOnlineBefore) : undefined,
    categoryIds: formFields.categoryIds
      ? JSON.parse(formFields.categoryIds)
      : [],
    premieredDay: formFields.premieredDay || undefined,
    orderNo: formFields.orderNo ? Number(formFields.orderNo) : 0,
    isHot: formFields.isHot ? Number(formFields.isHot) : 0,
  };

  const validatedFields = filmFormSchema.safeParse(formatFormFields);

  if (!validatedFields.success) {
    return {
      ...prevState,
      formData: formFields,
      fieldErrors: z.flattenError(validatedFields.error).fieldErrors,
    };
  }

  const res = await updateFilmService(validatedFields.data);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields,
      success: false,
      error: data.message || "Cập nhật phim thất bại",
    };
  }

  revalidatePath("/films");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const deleteFilmAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const filmId = formData.get("filmId") as string;

  const res = await deleteFilmService(Number(filmId));

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: "Xóa phim thất bại",
    };
  }

  revalidatePath("/films");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};
