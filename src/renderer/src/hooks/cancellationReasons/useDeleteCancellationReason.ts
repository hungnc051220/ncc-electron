import { cancellationReasonsApi } from "@renderer/api/cancellationReasons.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancellationReasonsKeys } from "./keys";

export const useDeleteCancellationReason = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancellationReasonsApi.delete,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: cancellationReasonsKeys.all
      });
    }
  });
};
