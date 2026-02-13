import { uploadImageApi } from "@renderer/api/uploadImage.api";
import { useMutation } from "@tanstack/react-query";

export const useUploadImage = () =>
  useMutation({
    mutationFn: uploadImageApi.single
  });
