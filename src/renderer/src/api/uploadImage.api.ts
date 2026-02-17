import { api } from "@renderer/api/client";

export const uploadImageApi = {
  single: async (file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/api/pos/v1/attachments/admin/upload", formData);

    return res.data;
  }
};
