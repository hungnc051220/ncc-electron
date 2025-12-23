"use server";

import {
  changePasswordFormSchema,
  updateUserFormSchema,
  userFormSchema,
} from "@/lib/schemas/user-schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  changePasswordService,
  createUserService,
  deleteUserService,
  updateUserService,
} from "./user-services";
import { deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";

type ActionStateProps = {
  formData: Record<string, string> | null;
  fieldErrors: Record<string, string[]> | null;
  success: boolean;
  error: string | null;
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
    isHidden: formData.get("isHidden") as string,
  };

  const formatFormFields = {
    ...formFields,
    roleIds: formFields.roleIds.split(",").map(Number),
    manufacturerId: Number(formFields.manufacturerId),
    isHidden: formFields.isHidden === "true" ? true : false,
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
    isHidden: formData.get("isHidden") as string,
  };

  const formatFormFields = {
    ...formFields,
    roleIds: formFields.roleIds.split(",").map(Number),
    manufacturerId: Number(formFields.manufacturerId),
    isHidden: formFields.isHidden !== "true",
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
    mobile?: string;
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

export const changePasswordAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const formFields = {
    password: formData.get("password") as string,
    new_password: formData.get("new_password") as string,
  };

  const validatedFields = changePasswordFormSchema.safeParse(formFields);

  if (!validatedFields.success) {
    return {
      ...prevState,
      formData: formFields,
      fieldErrors: z.flattenError(validatedFields.error).fieldErrors,
    };
  }

  const dataToSend = validatedFields.data;

  const res = await changePasswordService(dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      formData: formFields,
      success: false,
      error: data.message || "Thay đổi mật khẩu thất bại",
    };
  }

  return {
    ...prevState,
    success: true,
    error: null,
  };
};

export const logoutAction = async () => {
  await deleteSession();
  redirect("/sign-in");
};
