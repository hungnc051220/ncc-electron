import {
  cancellationReasonsApi,
  CanncellationReasonDto
} from "@renderer/api/cancellationReasons.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancellationReasonsKeys } from "./keys";

export const useUpdateCancellationReason = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: CanncellationReasonDto }) =>
      cancellationReasonsApi.update(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: cancellationReasonsKeys.all
      });
    }
  });
};
