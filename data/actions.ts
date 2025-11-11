"use server";

import {
  signInSchema,
  updateUserFormSchema,
  userFormSchema,
} from "@/lib/schemas";
import { deleteSession } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  approveRejectPlanCinemaService,
  bookingTicketService,
  createPlanCinemaService,
  createUserService,
  deletePlanCinemaService,
  deleteUserService,
  signInService,
  updateUserService,
} from "./services";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { BookingTicketBodyProps } from "@/types";
import { planCinemaFormSchema } from "@/lib/schemas";

export type ActionStateProps = {
  formData: Record<string, string> | null;
  fieldErrors: Record<string, string[]> | null;
  success: boolean;
  error: string | null;
};

export const signInAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const validatedFields = signInSchema.safeParse({ username, password });

  if (!validatedFields.success) {
    return {
      ...prevState,
      formData: { username, password },
      fieldErrors: z.flattenError(validatedFields.error).fieldErrors,
    };
  }

  const dataToSend = { ...validatedFields.data };

  const res = await signInService(dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: data.message || "Đăng nhập thất bại",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set("access_token", data.access_token, {
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: "lax",
    maxAge: data.expires_in,
  });

  cookieStore.set("refresh_token", data.refresh_token, {
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: "lax",
    maxAge: data.refresh_expires_in,
  });

  redirect("/");
};

export const signOutAction = async () => {
  await deleteSession();
  redirect("/sign-in");
};

export const createUserAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const formFields = {
    username: formData.get("username") as string,
    password: formData.get("password") as string,
    roleIds: formData.get("roleIds") as string,
    customerFirstName: formData.get("customerFirstName") as string,
    customerLastName: formData.get("customerLastName") as string,
    manufacturerId: formData.get("manufacturerId") as string,
    address: formData.get("address") as string,
    email: formData.get("email") as string,
    mobile: formData.get("mobile") as string,
  };

  const formatFormFields = {
    ...formFields,
    roleIds: formFields.roleIds.split(",").map(Number),
    manufacturerId: Number(formFields.manufacturerId),
  };

  const validatedFields = userFormSchema.safeParse(formatFormFields);

  if (!validatedFields.success) {
    return {
      ...prevState,
      formData: formFields,
      fieldErrors: z.flattenError(validatedFields.error).fieldErrors,
    };
  }

  const dataToSend = {
    ...formatFormFields,
    confirmPassword: validatedFields.data.password,
  };

  const res = await createUserService(dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields,
      success: false,
      error: data.message || "Thêm người dùng thất bại",
    };
  }

  revalidatePath("/users");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const updateUserAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const userId = formData.get("userId") as string;
  const formFields = {
    username: formData.get("username") as string,
    password: (formData.get("password") as string) || "",
    roleIds: formData.get("roleIds") as string,
    customerFirstName: formData.get("customerFirstName") as string,
    customerLastName: formData.get("customerLastName") as string,
    manufacturerId: formData.get("manufacturerId") as string,
    address: formData.get("address") as string,
    email: formData.get("email") as string,
    mobile: formData.get("mobile") as string,
  };

  const formatFormFields = {
    ...formFields,
    roleIds: formFields.roleIds.split(",").map(Number),
    manufacturerId: Number(formFields.manufacturerId),
  };

  const validatedFields = updateUserFormSchema.safeParse(formatFormFields);

  if (!validatedFields.success) {
    return {
      ...prevState,
      formData: formFields,
      fieldErrors: z.flattenError(validatedFields.error).fieldErrors,
    };
  }

  const dataToSend: {
    roleIds: number[];
    username: string;
    customerFirstName: string;
    customerLastName: string;
    manufacturerId: number;
    address?: string;
    email: string;
    mobile: string;
    password?: string;
    confirmPassword?: string;
  } = {
    ...validatedFields.data,
  };

  if (validatedFields.data.password) {
    dataToSend.password = validatedFields.data.password;
    dataToSend.confirmPassword = validatedFields.data.password;
  }

  const res = await updateUserService(Number(userId), dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields,
      success: false,
      error: data.message || "Cập nhật người dùng thất bại",
    };
  }

  revalidatePath("/users");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const deleteUserAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const userId = formData.get("userId") as string;

  const res = await deleteUserService(Number(userId));

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: "Xóa người dùng thất bại",
    };
  }

  revalidatePath("/users");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const bookingTicketAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const floorNo = Number(formData.get("floorNo") as string);

  const dataToSend: BookingTicketBodyProps = {
    planScreenId: Number(formData.get("planScreenId") as string),
    floorNo,
    paymentMethodSystemName: formData.get("paymentMethodSystemName") as string,
    posName: formData.get("posName") as string,
    posShortName: formData.get("posShortName") as string,
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

  const res = await bookingTicketService(dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: data.message || "Tạo đơn thất bại",
    };
  }

  revalidatePath(`/plan-screening/${data?.id}`);

  return {
    ...prevState,
    success: true,
    error: null,
  };
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
  const data = await response.json().catch(() => ({}));

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

  console.log({ id, isApproved });

  const res = await approveRejectPlanCinemaService({
    id: Number(id),
    isApproved: Boolean(isApproved),
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
